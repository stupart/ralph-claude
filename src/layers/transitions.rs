//! Layer transition handling
//!
//! Manages state changes when moving between layers.

use crate::status::{Layer, ProjectStatus};
use std::path::Path;

/// Execute a layer transition
pub fn transition_to_layer(
    status: &mut ProjectStatus,
    target: Layer,
    project_path: &Path,
) -> Result<(), String> {
    let current = status.current_layer;
    let current_num = current as u8;
    let target_num = target as u8;

    if target_num > current_num {
        // Forward transition
        advance_to_layer(status, target, project_path)
    } else if target_num < current_num {
        // Rollback
        rollback_to_layer(status, target, "Manual transition")
    } else {
        // Same layer, no-op
        Ok(())
    }
}

/// Advance forward to a target layer (marking intermediates as complete)
fn advance_to_layer(
    status: &mut ProjectStatus,
    target: Layer,
    _project_path: &Path,
) -> Result<(), String> {
    let current_num = status.current_layer as u8;
    let target_num = target as u8;

    // Mark all layers from current to target-1 as complete
    for i in current_num..target_num {
        let idx = i as usize - 1;
        if idx < status.layer_progress.len() {
            status.layer_progress[idx].complete = true;
        }
    }

    status.current_layer = target;
    status.current_chunk = None;
    status.current_item = None;
    status.iteration = 1;

    status.log(&format!(
        "Advanced from Layer {} to Layer {}: {}",
        current_num,
        target_num,
        target.name()
    ));

    Ok(())
}

/// Rollback to an earlier layer
fn rollback_to_layer(
    status: &mut ProjectStatus,
    target: Layer,
    reason: &str,
) -> Result<(), String> {
    let current_num = status.current_layer as u8;
    let target_num = target as u8;

    if target_num >= current_num {
        return Err("Cannot rollback to same or later layer".to_string());
    }

    // Mark layers from target to current as incomplete
    for i in target_num..=current_num {
        let idx = i as usize - 1;
        if idx < status.layer_progress.len() {
            status.layer_progress[idx].complete = false;
        }
    }

    status.current_layer = target;
    status.current_chunk = None;
    status.current_item = None;
    status.iteration = 1;

    status.log(&format!(
        "Rolled back from Layer {} to Layer {}: {} - {}",
        current_num,
        target_num,
        target.name(),
        reason
    ));

    Ok(())
}

/// Check if a forward transition is valid
pub fn can_advance(current: Layer, target: Layer, project_path: &Path) -> bool {
    use crate::layers::criteria;

    let current_num = current as u8;
    let target_num = target as u8;

    // Can only advance forward
    if target_num <= current_num {
        return false;
    }

    // Each layer between current and target must be completable
    for i in current_num..target_num {
        if let Some(layer) = Layer::from_number(i) {
            let complete = match layer {
                Layer::Input => criteria::is_input_complete(project_path),
                Layer::Decomposition => criteria::is_decomposition_complete(project_path),
                Layer::Synthesis => criteria::is_synthesis_complete(project_path),
                Layer::Outline => criteria::is_outline_complete(project_path),
                // For layers 5-7, check chunk status
                Layer::ChunkPlanning | Layer::Implementation | Layer::ChunkReview => {
                    criteria::get_next_chunk_to_implement(project_path).is_none()
                }
                Layer::Integration => criteria::is_integration_complete(project_path),
                Layer::FinalReview => criteria::get_final_review_result(project_path)
                    .map(|r| r == criteria::ReviewResult::Pass)
                    .unwrap_or(false),
                Layer::Analysis => criteria::is_analysis_complete(project_path),
            };

            if !complete {
                return false;
            }
        }
    }

    true
}
