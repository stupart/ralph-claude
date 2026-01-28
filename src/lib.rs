//! Ralph V3 - Layered Methodology for Autonomous Code Generation
//!
//! This library provides the core functionality for Ralph's V3 methodology:
//! - Status management (_status.md)
//! - Layer navigation and state machine
//! - Prompt templates per layer
//! - GAN reviewer system
//! - Session handoff

pub mod status;
pub mod layers;
pub mod prompts;
pub mod init;
// pub mod reviewer;  // TODO: implement
// pub mod session;   // TODO: implement
// pub mod git_ops;   // TODO: implement

pub use status::{ProjectStatus, Layer, load_status, save_status, init_status};
pub use layers::{get_next_action, NextAction, LayerWork, ReviewType};
pub use prompts::generate_prompt;
pub use init::{init_project, is_v3_initialized, has_input_material};
