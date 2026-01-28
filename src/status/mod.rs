//! Status management for V3 layered methodology
//!
//! _status.md is the source of truth for project state.
//! This module handles parsing, updating, and validating status.

mod types;
mod parser;
mod writer;

pub use types::*;
pub use parser::parse_status;
pub use writer::write_status;

use std::path::Path;
use std::fs;

/// Load status from _status.md in the given project directory
pub fn load_status(project_path: &Path) -> Result<ProjectStatus, StatusError> {
    let status_path = project_path.join("_status.md");

    if !status_path.exists() {
        return Err(StatusError::NotFound);
    }

    let content = fs::read_to_string(&status_path)
        .map_err(|e| StatusError::ReadError(e.to_string()))?;

    parse_status(&content)
}

/// Save status to _status.md
pub fn save_status(project_path: &Path, status: &ProjectStatus) -> Result<(), StatusError> {
    let status_path = project_path.join("_status.md");
    let content = writer::render_status(status);

    fs::write(&status_path, content)
        .map_err(|e| StatusError::WriteError(e.to_string()))?;

    Ok(())
}

/// Update a specific field in status and save
pub fn update_status<F>(project_path: &Path, updater: F) -> Result<ProjectStatus, StatusError>
where
    F: FnOnce(&mut ProjectStatus),
{
    let mut status = load_status(project_path)?;
    updater(&mut status);
    status.last_updated = chrono::Utc::now();
    save_status(project_path, &status)?;
    Ok(status)
}

/// Initialize a new _status.md for a fresh project
pub fn init_status(project_path: &Path, project_name: &str) -> Result<ProjectStatus, StatusError> {
    let status = ProjectStatus::new(project_name.to_string());
    save_status(project_path, &status)?;
    Ok(status)
}
