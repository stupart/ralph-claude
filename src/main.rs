use chrono::Local;
use clap::Parser;
use colored::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::Path;
use std::process::{Command, ExitStatus};

#[derive(Parser, Debug)]
#[command(name = "ralph")]
#[command(about = "Run Claude Code in autonomous loops until PRD is complete")]
struct Args {
    /// Project name (creates folder if provided)
    #[arg()]
    project_name: Option<String>,

    /// Path to the prompt file
    #[arg(short, long, default_value = ".claude/commands/ralph.md")]
    prompt: String,

    /// Path to PRD file
    #[arg(long, default_value = "PRD.json")]
    prd: String,

    /// Maximum iterations (0 = unlimited)
    #[arg(short, long, default_value = "0")]
    max_iterations: u32,

    /// Delay between iterations in seconds
    #[arg(short, long, default_value = "2")]
    delay: u64,

    /// Run in dry-run mode (don't execute claude)
    #[arg(long)]
    dry_run: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Feature {
    id: String,
    #[serde(alias = "title", alias = "name")]
    name: String,
    #[serde(default)]
    description: String,
    status: FeatureStatus,
    #[serde(default)]
    acceptance_criteria: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
enum FeatureStatus {
    Pending,
    InProgress,
    Failing,
    Passing,
}

#[derive(Serialize, Deserialize, Debug)]
struct Prd {
    project: String,
    features: Vec<Feature>,
}

fn main() {
    let args = Args::parse();

    // If project name provided, create folder and cd into it
    if let Some(ref name) = args.project_name {
        let path = Path::new(name);
        if path.exists() {
            // Folder exists, cd into it
            std::env::set_current_dir(name).expect("Failed to cd into project directory");
            println!("{} {}/", "Entering".cyan(), name);
        } else {
            // Create folder and cd into it
            fs::create_dir_all(name).expect("Failed to create project directory");
            std::env::set_current_dir(name).expect("Failed to cd into project directory");
            println!("{} {}/", "Created".green(), name);
        }
    }

    // Initialize if not already set up
    if !is_initialized() {
        init_project();
    }

    // Interview if PRD is empty
    if needs_interview(&args.prd) {
        println!("\n{}", "PRD is empty. Starting interview...".cyan().bold());
        run_interview();
        println!("\n{}", "Interview complete. Starting build loop...".green().bold());
    }

    // Run the build loop
    run_loop(&args);
}

fn is_initialized() -> bool {
    Path::new("CLAUDE.md").exists() && Path::new("PRD.json").exists()
}

fn needs_interview(prd_path: &str) -> bool {
    match fs::read_to_string(prd_path) {
        Ok(content) => {
            match serde_json::from_str::<Prd>(&content) {
                Ok(prd) => prd.features.is_empty(),
                Err(_) => true,
            }
        }
        Err(_) => true,
    }
}

fn run_interview() {
    let interview_prompt = match fs::read_to_string(".claude/commands/interview.md") {
        Ok(p) => p,
        Err(_) => {
            eprintln!("{}", "Error: .claude/commands/interview.md not found".red());
            std::process::exit(1);
        }
    };

    let status = run_claude(&interview_prompt);

    if let Err(e) = status {
        eprintln!("{} {}", "Interview failed:".red(), e);
        std::process::exit(1);
    }
}

fn init_project() {
    println!("{}", "Initializing ralph project...".cyan().bold());

    // Initialize git if not already a repo
    if !Path::new(".git").exists() {
        Command::new("git").arg("init").status().ok();
        println!("  {} git repository", "init".green());
    }

    // Create directories
    fs::create_dir_all(".claude/commands").expect("Failed to create .claude/commands");

    // Create template files
    let templates = get_templates();

    for (path, content) in templates {
        if Path::new(path).exists() {
            println!("  {} {} (already exists)", "skip".yellow(), path);
        } else {
            fs::write(path, content).unwrap_or_else(|_| panic!("Failed to write {}", path));
            println!("  {} {}", "create".green(), path);
        }
    }

    // Prompt for brain dump
    prompt_brain_dump();

    println!("\n{}", "Setup complete!".green().bold());
}

fn get_templates() -> Vec<(&'static str, &'static str)> {
    vec![
        ("CLAUDE.md", include_str!("../templates/CLAUDE.md")),
        ("PRD.json", include_str!("../templates/PRD.json")),
        ("progress.md", include_str!("../templates/progress.md")),
        ("guardrails.md", include_str!("../templates/guardrails.md")),
        (".claude/settings.json", include_str!("../templates/settings.json")),
        (".claude/commands/interview.md", include_str!("../templates/commands/interview.md")),
        (".claude/commands/plan.md", include_str!("../templates/commands/plan.md")),
        (".claude/commands/build.md", include_str!("../templates/commands/build.md")),
        (".claude/commands/ralph.md", include_str!("../templates/commands/ralph.md")),
    ]
}

fn prompt_brain_dump() {
    println!("\n{}", "Brain dump?".cyan().bold());
    print!("{}", "Do you have context to add? (y/n): ".dimmed());
    io::stdout().flush().unwrap();

    let mut answer = String::new();
    if io::stdin().read_line(&mut answer).is_err() {
        println!("  {} brain dump", "skip".yellow());
        return;
    }

    let answer = answer.trim().to_lowercase();
    if answer != "y" && answer != "yes" {
        println!("  {} brain dump", "skip".yellow());
        return;
    }

    // Create temp file with template
    let temp_path = std::env::temp_dir().join("ralph-brain-dump.md");
    let template = "# Brain Dump\n\n<!-- Paste or write your context below. Save and close when done. -->\n<!-- Delete all content (including these comments) to skip. -->\n\n";
    fs::write(&temp_path, template).expect("Failed to create temp file");

    // Get editor from env, fallback to common editors
    let editor = std::env::var("EDITOR")
        .or_else(|_| std::env::var("VISUAL"))
        .unwrap_or_else(|_| {
            // Check what's available
            if Command::new("code").arg("--version").output().is_ok() {
                "code --wait".to_string()
            } else if Command::new("nano").arg("--version").output().is_ok() {
                "nano".to_string()
            } else if Command::new("vim").arg("--version").output().is_ok() {
                "vim".to_string()
            } else {
                "vi".to_string()
            }
        });

    println!("{}", format!("Opening editor ({})...", editor.split_whitespace().next().unwrap_or("editor")).dimmed());

    // Parse editor command (handle "code --wait" style)
    let parts: Vec<&str> = editor.split_whitespace().collect();
    let (cmd, args) = parts.split_first().unwrap_or((&"vi", &[]));

    let status = Command::new(cmd)
        .args(args.iter())
        .arg(&temp_path)
        .stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .status();

    if status.is_err() || !status.unwrap().success() {
        println!("  {} brain dump (editor failed)", "skip".yellow());
        let _ = fs::remove_file(&temp_path);
        return;
    }

    // Read content back
    let content = fs::read_to_string(&temp_path).unwrap_or_default();
    let _ = fs::remove_file(&temp_path);

    // Strip template comments and check if empty
    let content: String = content
        .lines()
        .filter(|line| !line.trim().starts_with("<!--") || !line.trim().ends_with("-->"))
        .collect::<Vec<_>>()
        .join("\n");
    let content = content.trim();

    if content.is_empty() || content == "# Brain Dump" {
        println!("  {} brain dump (empty)", "skip".yellow());
        return;
    }

    fs::create_dir_all("docs").expect("Failed to create docs directory");

    let next_num = get_next_brain_dump_number();
    let date = Local::now().format("%Y-%m-%d");
    let filename = format!("docs/brain-dump-{:03}-{}.md", next_num, date);

    let file_content = format!("# Brain Dump #{:03}\n\nCaptured: {}\n\n---\n\n{}\n", next_num, date, content);
    fs::write(&filename, &file_content).expect("Failed to write brain dump");
    println!("  {} {}", "create".green(), filename);
}

fn get_next_brain_dump_number() -> u32 {
    let docs_path = Path::new("docs");
    if !docs_path.exists() {
        return 1;
    }

    let mut max_num: u32 = 0;

    if let Ok(entries) = fs::read_dir(docs_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("brain-dump-") && name.ends_with(".md") {
                if let Some(num_str) = name.get(11..14) {
                    if let Ok(num) = num_str.parse::<u32>() {
                        max_num = max_num.max(num);
                    }
                }
            }
        }
    }

    max_num + 1
}

fn run_loop(args: &Args) {
    println!("\n{}", "Starting ralph loop...".cyan().bold());

    let mut iteration = 0u32;

    loop {
        iteration += 1;

        if args.max_iterations > 0 && iteration > args.max_iterations {
            println!("\n{}", format!("Reached max iterations ({})", args.max_iterations).yellow());
            break;
        }

        match check_prd_complete(&args.prd) {
            Ok(true) => {
                println!("\n{}", "All features passing! PRD complete.".green().bold());
                break;
            }
            Ok(false) => {}
            Err(e) => {
                println!("{} {}", "Warning: Could not read PRD:".yellow(), e);
            }
        }

        let timestamp = Local::now().format("%H:%M:%S");
        println!(
            "\n{} {} {}",
            format!("[{}]", timestamp).dimmed(),
            "Iteration".cyan(),
            iteration.to_string().cyan().bold()
        );

        let prompt = match fs::read_to_string(&args.prompt) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("{} {}: {}", "Error reading prompt".red(), args.prompt, e);
                std::process::exit(1);
            }
        };

        if args.dry_run {
            println!("{}", "Dry run - would execute claude with prompt:".yellow());
            println!("{}", prompt.dimmed());
            std::thread::sleep(std::time::Duration::from_secs(args.delay));
            continue;
        }

        log_progress(&format!("Starting iteration {}", iteration));

        let status = run_claude(&prompt);

        match status {
            Ok(s) if s.success() => {
                log_progress(&format!("Iteration {} completed successfully", iteration));
            }
            Ok(s) => {
                log_progress(&format!("Iteration {} exited with status: {}", iteration, s));
            }
            Err(e) => {
                eprintln!("{} {}", "Error running claude:".red(), e);
                log_progress(&format!("Iteration {} failed: {}", iteration, e));
            }
        }

        if args.delay > 0 {
            std::thread::sleep(std::time::Duration::from_secs(args.delay));
        }
    }

    println!("\n{}", "Ralph loop finished.".cyan().bold());
}

fn check_prd_complete(prd_path: &str) -> Result<bool, String> {
    let content = fs::read_to_string(prd_path).map_err(|e| e.to_string())?;
    let prd: Prd = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let all_passing = prd.features.iter().all(|f| f.status == FeatureStatus::Passing);

    let passing = prd.features.iter().filter(|f| f.status == FeatureStatus::Passing).count();
    let total = prd.features.len();
    println!(
        "  {} {}/{}",
        "PRD status:".dimmed(),
        passing.to_string().green(),
        total
    );

    Ok(all_passing)
}

fn run_claude(prompt: &str) -> io::Result<ExitStatus> {
    let mut cmd = Command::new("claude");

    cmd.arg(prompt);
    cmd.arg("--dangerously-skip-permissions");

    cmd.stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit());

    cmd.status()
}

fn log_progress(message: &str) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    let log_entry = format!("\n## [{}]\n{}\n", timestamp, message);

    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("progress.md")
    {
        let _ = file.write_all(log_entry.as_bytes());
    }
}
