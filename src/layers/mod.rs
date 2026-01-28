//! Layer navigation and state machine for V3 methodology
//!
//! Handles determining what action to take based on current layer,
//! checking completion criteria, and managing transitions.

mod criteria;
mod transitions;

pub use criteria::*;
pub use transitions::*;

use crate::status::{Layer, ProjectStatus};
use std::path::Path;

/// What action should be taken next
#[derive(Debug, Clone)]
pub enum NextAction {
    /// Work on the current layer
    Work(LayerWork),
    /// Advance to next layer
    Advance,
    /// Run GAN review
    Review(ReviewType),
    /// Rollback to earlier layer
    Rollback { target: Layer, reason: String },
    /// Project complete
    Complete,
    /// Blocked - needs human intervention
    Blocked(String),
}

/// Specific work to do within a layer
#[derive(Debug, Clone)]
pub struct LayerWork {
    pub layer: Layer,
    pub description: String,
    pub chunk: Option<String>,
    pub item: Option<String>,
}

/// Type of review to run
#[derive(Debug, Clone)]
pub enum ReviewType {
    Chunk(String),
    Integration,
    Final,
}

/// Determine the next action based on current status
pub fn get_next_action(status: &ProjectStatus, project_path: &Path) -> NextAction {
    // Check for blockers first
    if !status.blockers.is_empty() {
        return NextAction::Blocked(status.blockers.join(", "));
    }

    match status.current_layer {
        Layer::Input => handle_input_layer(status, project_path),
        Layer::Decomposition => handle_decomposition_layer(status, project_path),
        Layer::Synthesis => handle_synthesis_layer(status, project_path),
        Layer::Outline => handle_outline_layer(status, project_path),
        Layer::ChunkPlanning => handle_chunk_planning_layer(status, project_path),
        Layer::Implementation => handle_implementation_layer(status, project_path),
        Layer::ChunkReview => handle_chunk_review_layer(status, project_path),
        Layer::Integration => handle_integration_layer(status, project_path),
        Layer::FinalReview => handle_final_review_layer(status, project_path),
        Layer::Analysis => handle_analysis_layer(status, project_path),
    }
}

fn handle_input_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    if criteria::is_input_complete(project_path) {
        NextAction::Advance
    } else {
        NextAction::Work(LayerWork {
            layer: Layer::Input,
            description: "Gather brain dumps, research, and designs".to_string(),
            chunk: None,
            item: None,
        })
    }
}

fn handle_decomposition_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    if criteria::is_decomposition_complete(project_path) {
        NextAction::Advance
    } else {
        NextAction::Work(LayerWork {
            layer: Layer::Decomposition,
            description: "Extract quotes, identify patterns, create affinities".to_string(),
            chunk: None,
            item: None,
        })
    }
}

fn handle_synthesis_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    if criteria::is_synthesis_complete(project_path) {
        NextAction::Advance
    } else {
        NextAction::Work(LayerWork {
            layer: Layer::Synthesis,
            description: "Create JTBD, journeys, architecture decisions".to_string(),
            chunk: None,
            item: None,
        })
    }
}

fn handle_outline_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    if criteria::is_outline_complete(project_path) {
        NextAction::Advance
    } else {
        NextAction::Work(LayerWork {
            layer: Layer::Outline,
            description: "Create implementation plan with major chunks".to_string(),
            chunk: None,
            item: None,
        })
    }
}

fn handle_chunk_planning_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    // Find the next chunk that needs planning
    if let Some(chunk_id) = criteria::get_next_unplanned_chunk(project_path) {
        NextAction::Work(LayerWork {
            layer: Layer::ChunkPlanning,
            description: format!("Create specs for chunk: {}", chunk_id),
            chunk: Some(chunk_id),
            item: None,
        })
    } else if criteria::has_chunks_to_implement(project_path) {
        // All chunks planned, move to implementation
        NextAction::Advance
    } else {
        // No chunks defined yet
        NextAction::Blocked("No chunks defined in outline".to_string())
    }
}

fn handle_implementation_layer(status: &ProjectStatus, project_path: &Path) -> NextAction {
    // Find the current chunk being worked on
    let chunk_id = status.current_chunk.clone()
        .or_else(|| criteria::get_next_chunk_to_implement(project_path));

    if let Some(chunk) = chunk_id {
        // Check if this chunk is complete
        if criteria::is_chunk_implemented(&chunk, project_path) {
            // Move to review
            return NextAction::Review(ReviewType::Chunk(chunk));
        }

        // Find next item to implement
        if let Some(item) = criteria::get_next_item_to_implement(&chunk, project_path) {
            NextAction::Work(LayerWork {
                layer: Layer::Implementation,
                description: format!("Implement: {}", item),
                chunk: Some(chunk),
                item: Some(item),
            })
        } else {
            // Chunk complete, ready for review
            NextAction::Review(ReviewType::Chunk(chunk))
        }
    } else {
        // All chunks implemented, move to integration
        NextAction::Advance
    }
}

fn handle_chunk_review_layer(status: &ProjectStatus, project_path: &Path) -> NextAction {
    if let Some(chunk) = &status.current_chunk {
        // Check review result
        match criteria::get_review_result(chunk, project_path) {
            Some(ReviewResult::Pass) => {
                // Find next chunk or advance
                if let Some(next_chunk) = criteria::get_next_chunk_to_implement(project_path) {
                    NextAction::Work(LayerWork {
                        layer: Layer::ChunkPlanning,
                        description: format!("Plan next chunk: {}", next_chunk),
                        chunk: Some(next_chunk),
                        item: None,
                    })
                } else {
                    NextAction::Advance // All chunks done, go to integration
                }
            }
            Some(ReviewResult::FailMinor) => {
                NextAction::Rollback {
                    target: Layer::Implementation,
                    reason: "Review found minor issues".to_string(),
                }
            }
            Some(ReviewResult::FailMajor) => {
                NextAction::Rollback {
                    target: Layer::ChunkPlanning,
                    reason: "Review found major issues - revise specs".to_string(),
                }
            }
            Some(ReviewResult::Escalate) => {
                NextAction::Rollback {
                    target: Layer::Outline,
                    reason: "3 review failures - rethink chunk structure".to_string(),
                }
            }
            None => {
                // Review not done yet, do it
                NextAction::Review(ReviewType::Chunk(chunk.clone()))
            }
        }
    } else {
        NextAction::Blocked("No chunk specified for review".to_string())
    }
}

fn handle_integration_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    if criteria::is_integration_complete(project_path) {
        NextAction::Advance
    } else {
        NextAction::Work(LayerWork {
            layer: Layer::Integration,
            description: "Run integration tests across all chunks".to_string(),
            chunk: None,
            item: None,
        })
    }
}

fn handle_final_review_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    match criteria::get_final_review_result(project_path) {
        Some(ReviewResult::Pass) => NextAction::Advance,
        Some(ReviewResult::FailMinor) | Some(ReviewResult::FailMajor) => {
            // Identify which chunks need rework
            NextAction::Rollback {
                target: Layer::ChunkPlanning,
                reason: "Final review found issues".to_string(),
            }
        }
        Some(ReviewResult::Escalate) => {
            NextAction::Rollback {
                target: Layer::Synthesis,
                reason: "Fundamental issues found - revisit synthesis".to_string(),
            }
        }
        None => NextAction::Review(ReviewType::Final),
    }
}

fn handle_analysis_layer(_status: &ProjectStatus, project_path: &Path) -> NextAction {
    if criteria::is_analysis_complete(project_path) {
        NextAction::Complete
    } else {
        NextAction::Work(LayerWork {
            layer: Layer::Analysis,
            description: "Write project retrospective".to_string(),
            chunk: None,
            item: None,
        })
    }
}
