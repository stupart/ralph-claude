//! GAN Reviewer Module
//!
//! Implements the adversarial review system for V3 methodology.
//! The reviewer acts as a critic, checking implementation quality
//! against specs and creating review documents.

mod templates;
mod parser;

use std::fs;
use std::path::Path;

pub use templates::*;
pub use parser::*;

/// Review severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Minor,
    Major,
}

impl Severity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Severity::Minor => "MINOR",
            Severity::Major => "MAJOR",
        }
    }
}

/// A single issue found during review
#[derive(Debug, Clone)]
pub struct ReviewIssue {
    pub title: String,
    pub severity: Severity,
    pub description: String,
    pub recommendation: String,
    pub spec_file: Option<String>,
}

/// Verdict from a review
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReviewVerdict {
    Pass,
    Fail,
}

impl ReviewVerdict {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReviewVerdict::Pass => "PASS",
            ReviewVerdict::Fail => "FAIL",
        }
    }
}

/// Result of reviewing a spec
#[derive(Debug, Clone)]
pub struct SpecReview {
    pub spec_file: String,
    pub status: ReviewVerdict,
    pub notes: String,
    pub issues: Vec<ReviewIssue>,
}

/// Complete review of a chunk
#[derive(Debug, Clone)]
pub struct ChunkReview {
    pub chunk_id: String,
    pub chunk_name: String,
    pub iteration: u8,
    pub verdict: ReviewVerdict,
    pub spec_reviews: Vec<SpecReview>,
    pub overall_issues: Vec<ReviewIssue>,
    pub what_worked: Vec<String>,
    pub recommendations: Vec<String>,
}

impl ChunkReview {
    /// Create a new chunk review
    pub fn new(chunk_id: String, chunk_name: String, iteration: u8) -> Self {
        ChunkReview {
            chunk_id,
            chunk_name,
            iteration,
            verdict: ReviewVerdict::Pass, // Default to pass, will be set based on issues
            spec_reviews: vec![],
            overall_issues: vec![],
            what_worked: vec![],
            recommendations: vec![],
        }
    }

    /// Add a spec review
    pub fn add_spec_review(&mut self, review: SpecReview) {
        if review.status == ReviewVerdict::Fail {
            self.verdict = ReviewVerdict::Fail;
        }
        self.spec_reviews.push(review);
    }

    /// Add an overall issue
    pub fn add_issue(&mut self, issue: ReviewIssue) {
        if issue.severity == Severity::Major {
            self.verdict = ReviewVerdict::Fail;
        }
        self.overall_issues.push(issue);
    }

    /// Render to markdown format
    pub fn to_markdown(&self) -> String {
        let date = chrono::Utc::now().format("%Y-%m-%d");

        let mut md = String::new();

        md.push_str(&format!("# Review: {}\n\n", self.chunk_name));
        md.push_str("**Reviewer:** GAN Critic\n");
        md.push_str(&format!("**Date:** {}\n", date));
        md.push_str(&format!("**Iteration:** {} of 3\n\n", self.iteration));

        md.push_str(&format!("## Verdict: {}\n\n", self.verdict.as_str()));

        // Spec reviews
        md.push_str("## Spec Reviews\n\n");
        for sr in &self.spec_reviews {
            md.push_str(&format!("### {}\n", sr.spec_file));
            md.push_str(&format!("**Status:** {}\n", sr.status.as_str()));
            if !sr.notes.is_empty() {
                md.push_str(&format!("**Notes:** {}\n", sr.notes));
            }
            if !sr.issues.is_empty() {
                md.push_str("**Issues:**\n");
                for issue in &sr.issues {
                    md.push_str(&format!("- {} ({}) - {}\n",
                        issue.title, issue.severity.as_str(), issue.description));
                }
            }
            md.push_str("\n");
        }

        // Overall issues
        if !self.overall_issues.is_empty() {
            md.push_str("## Overall Issues\n\n");
            for (i, issue) in self.overall_issues.iter().enumerate() {
                md.push_str(&format!("### Issue {}: {}\n", i + 1, issue.title));
                md.push_str(&format!("**Severity:** {}\n", issue.severity.as_str()));
                md.push_str(&format!("**Description:** {}\n", issue.description));
                md.push_str(&format!("**Recommendation:** {}\n\n", issue.recommendation));
            }
        }

        // What worked well
        if !self.what_worked.is_empty() {
            md.push_str("## What Worked Well\n\n");
            for item in &self.what_worked {
                md.push_str(&format!("- {}\n", item));
            }
            md.push_str("\n");
        }

        // Recommendations
        if !self.recommendations.is_empty() {
            md.push_str("## Recommendations\n\n");
            for rec in &self.recommendations {
                md.push_str(&format!("- {}\n", rec));
            }
        }

        md
    }

    /// Save review to file
    pub fn save(&self, project_path: &Path) -> std::io::Result<()> {
        let review_path = project_path
            .join("5-chunks")
            .join(&self.chunk_id)
            .join("_review.md");

        fs::write(&review_path, self.to_markdown())
    }
}

/// Complete review at integration level
#[derive(Debug, Clone)]
pub struct IntegrationReview {
    pub date: String,
    pub scenarios: Vec<TestScenario>,
    pub cross_feature_tests: Vec<CrossFeatureTest>,
    pub performance_notes: String,
    pub verdict: ReviewVerdict,
}

/// A test scenario
#[derive(Debug, Clone)]
pub struct TestScenario {
    pub name: String,
    pub flow: String,
    pub result: ReviewVerdict,
    pub notes: String,
}

/// Cross-feature interaction test
#[derive(Debug, Clone)]
pub struct CrossFeatureTest {
    pub feature_a: String,
    pub feature_b: String,
    pub result: ReviewVerdict,
    pub notes: String,
}

impl IntegrationReview {
    /// Render to markdown
    pub fn to_markdown(&self) -> String {
        let mut md = String::new();

        md.push_str("# Integration Test Results\n\n");
        md.push_str(&format!("**Date:** {}\n\n", self.date));

        md.push_str("## Test Scenarios\n\n");
        for scenario in &self.scenarios {
            md.push_str(&format!("### Scenario: {}\n", scenario.name));
            md.push_str(&format!("**Flow:** {}\n", scenario.flow));
            md.push_str(&format!("**Result:** {}\n", scenario.result.as_str()));
            md.push_str(&format!("**Notes:** {}\n\n", scenario.notes));
        }

        md.push_str("## Cross-Feature Tests\n\n");
        for test in &self.cross_feature_tests {
            md.push_str(&format!("### {} + {}\n", test.feature_a, test.feature_b));
            md.push_str(&format!("**Result:** {}\n", test.result.as_str()));
            md.push_str(&format!("**Notes:** {}\n\n", test.notes));
        }

        md.push_str("## Performance\n\n");
        md.push_str(&format!("{}\n\n", self.performance_notes));

        md.push_str("## Overall Verdict\n\n");
        md.push_str(&format!("All tests passing: {}\n",
            if self.verdict == ReviewVerdict::Pass { "YES" } else { "NO" }));

        md
    }

    /// Save to integration folder
    pub fn save(&self, project_path: &Path) -> std::io::Result<()> {
        let path = project_path.join("6-integration/test-results.md");
        fs::create_dir_all(path.parent().unwrap())?;
        fs::write(&path, self.to_markdown())
    }
}

/// Final review of the entire project
#[derive(Debug, Clone)]
pub struct FinalReview {
    pub date: String,
    pub verdict: ReviewVerdict,
    pub feature_reviews: Vec<FeatureReview>,
    pub design_consistency: (ReviewVerdict, String),
    pub error_handling: (ReviewVerdict, String),
    pub what_worked: Vec<String>,
    pub issues: Vec<(String, String)>, // (issue, which chunk to fix)
    pub recommendation: String,
}

/// Review of a single feature in final review
#[derive(Debug, Clone)]
pub struct FeatureReview {
    pub name: String,
    pub status: ReviewVerdict,
    pub notes: String,
}

impl FinalReview {
    /// Render to markdown
    pub fn to_markdown(&self) -> String {
        let mut md = String::new();

        md.push_str("# Final Review\n\n");
        md.push_str("**Reviewer:** GAN Critic\n");
        md.push_str(&format!("**Date:** {}\n\n", self.date));

        md.push_str(&format!("## Verdict: {}\n\n", self.verdict.as_str()));

        md.push_str("## UX Walkthrough\n\n");
        for feature in &self.feature_reviews {
            md.push_str(&format!("### Feature: {}\n", feature.name));
            md.push_str(&format!("**Status:** {}\n", feature.status.as_str()));
            md.push_str(&format!("**Notes:** {}\n\n", feature.notes));
        }

        md.push_str("## Design Consistency\n");
        md.push_str(&format!("**Status:** {}\n", self.design_consistency.0.as_str()));
        md.push_str(&format!("**Notes:** {}\n\n", self.design_consistency.1));

        md.push_str("## Error Handling\n");
        md.push_str(&format!("**Status:** {}\n", self.error_handling.0.as_str()));
        md.push_str(&format!("**Notes:** {}\n\n", self.error_handling.1));

        md.push_str("## Overall Assessment\n\n");

        if !self.what_worked.is_empty() {
            md.push_str("### What Works Well\n");
            for item in &self.what_worked {
                md.push_str(&format!("- {}\n", item));
            }
            md.push_str("\n");
        }

        if !self.issues.is_empty() && self.verdict == ReviewVerdict::Fail {
            md.push_str("### Issues\n");
            for (issue, chunk) in &self.issues {
                md.push_str(&format!("- {} (fix in {})\n", issue, chunk));
            }
            md.push_str("\n");
        }

        md.push_str("### Recommendation\n");
        md.push_str(&format!("{}\n", self.recommendation));

        md
    }

    /// Save to integration folder
    pub fn save(&self, project_path: &Path) -> std::io::Result<()> {
        let path = project_path.join("6-integration/final-review.md");
        fs::create_dir_all(path.parent().unwrap())?;
        fs::write(&path, self.to_markdown())
    }
}

/// Generate the review prompt for a chunk
pub fn generate_chunk_review_prompt(chunk_id: &str, project_path: &Path) -> String {
    templates::get_chunk_review_prompt(chunk_id, project_path)
}

/// Generate the review prompt for integration
pub fn generate_integration_review_prompt(project_path: &Path) -> String {
    templates::get_integration_review_prompt(project_path)
}

/// Generate the final review prompt
pub fn generate_final_review_prompt(project_path: &Path) -> String {
    templates::get_final_review_prompt(project_path)
}
