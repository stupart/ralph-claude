//! Type definitions for project status

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Error types for status operations
#[derive(Debug)]
pub enum StatusError {
    NotFound,
    ReadError(String),
    WriteError(String),
    ParseError(String),
}

impl std::fmt::Display for StatusError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StatusError::NotFound => write!(f, "_status.md not found"),
            StatusError::ReadError(e) => write!(f, "Failed to read status: {}", e),
            StatusError::WriteError(e) => write!(f, "Failed to write status: {}", e),
            StatusError::ParseError(e) => write!(f, "Failed to parse status: {}", e),
        }
    }
}

impl std::error::Error for StatusError {}

/// The 10 layers in V3 methodology
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Layer {
    Input = 1,
    Decomposition = 2,
    Synthesis = 3,
    Outline = 4,
    ChunkPlanning = 5,
    Implementation = 6,
    ChunkReview = 7,
    Integration = 8,
    FinalReview = 9,
    Analysis = 10,
}

impl Layer {
    pub fn name(&self) -> &'static str {
        match self {
            Layer::Input => "Input",
            Layer::Decomposition => "Decomposition",
            Layer::Synthesis => "Synthesis",
            Layer::Outline => "Outline",
            Layer::ChunkPlanning => "Chunk Planning",
            Layer::Implementation => "Implementation",
            Layer::ChunkReview => "Chunk Review",
            Layer::Integration => "Integration",
            Layer::FinalReview => "Final Review",
            Layer::Analysis => "Analysis",
        }
    }

    pub fn folder(&self) -> &'static str {
        match self {
            Layer::Input => "1-input",
            Layer::Decomposition => "2-decomposition",
            Layer::Synthesis => "3-synthesis",
            Layer::Outline => "4-outline",
            Layer::ChunkPlanning => "5-chunks",
            Layer::Implementation => "5-chunks",
            Layer::ChunkReview => "5-chunks",
            Layer::Integration => "6-integration",
            Layer::FinalReview => "6-integration",
            Layer::Analysis => "7-analysis",
        }
    }

    pub fn from_number(n: u8) -> Option<Layer> {
        match n {
            1 => Some(Layer::Input),
            2 => Some(Layer::Decomposition),
            3 => Some(Layer::Synthesis),
            4 => Some(Layer::Outline),
            5 => Some(Layer::ChunkPlanning),
            6 => Some(Layer::Implementation),
            7 => Some(Layer::ChunkReview),
            8 => Some(Layer::Integration),
            9 => Some(Layer::FinalReview),
            10 => Some(Layer::Analysis),
            _ => None,
        }
    }

    pub fn next(&self) -> Option<Layer> {
        Layer::from_number(*self as u8 + 1)
    }

    pub fn prev(&self) -> Option<Layer> {
        if *self as u8 > 1 {
            Layer::from_number(*self as u8 - 1)
        } else {
            None
        }
    }
}

/// Status of a single item within a chunk
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ItemStatus {
    Todo,
    InProgress,
    Done,
    ReviewFailed,
}

impl ItemStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ItemStatus::Todo => "todo",
            ItemStatus::InProgress => "in-progress",
            ItemStatus::Done => "done",
            ItemStatus::ReviewFailed => "review-failed",
        }
    }

    pub fn from_str(s: &str) -> Option<ItemStatus> {
        match s.to_lowercase().as_str() {
            "todo" => Some(ItemStatus::Todo),
            "in-progress" | "in_progress" | "inprogress" => Some(ItemStatus::InProgress),
            "done" | "complete" | "completed" => Some(ItemStatus::Done),
            "review-failed" | "review_failed" | "failed" => Some(ItemStatus::ReviewFailed),
            _ => None,
        }
    }
}

/// Status of a chunk
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChunkStatus {
    Todo,
    InProgress,
    Passed,
    Failed,
}

impl ChunkStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ChunkStatus::Todo => "todo",
            ChunkStatus::InProgress => "in-progress",
            ChunkStatus::Passed => "passed",
            ChunkStatus::Failed => "failed",
        }
    }
}

/// Progress tracking for a single item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemProgress {
    pub spec_file: String,
    pub status: ItemStatus,
    pub is_current: bool,
}

/// Progress tracking for a chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkProgress {
    pub id: String,
    pub name: String,
    pub status: ChunkStatus,
    pub items: Vec<ItemProgress>,
    pub iteration: u8,
}

/// Progress tracking for a layer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerProgress {
    pub layer: Layer,
    pub complete: bool,
    pub chunks: Option<Vec<ChunkProgress>>,
}

/// History entry for recent actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub timestamp: DateTime<Utc>,
    pub action: String,
}

/// Main project status structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStatus {
    pub project_name: String,
    pub started: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,

    pub current_layer: Layer,
    pub current_chunk: Option<String>,
    pub current_item: Option<String>,
    pub iteration: u8,

    pub layer_progress: Vec<LayerProgress>,

    pub context: String,
    pub next_action: String,
    pub blockers: Vec<String>,

    pub history: Vec<HistoryEntry>,
}

impl ProjectStatus {
    /// Create a new status for a fresh project
    pub fn new(project_name: String) -> Self {
        let now = Utc::now();

        // Initialize layer progress for all 10 layers
        let layer_progress = vec![
            LayerProgress { layer: Layer::Input, complete: false, chunks: None },
            LayerProgress { layer: Layer::Decomposition, complete: false, chunks: None },
            LayerProgress { layer: Layer::Synthesis, complete: false, chunks: None },
            LayerProgress { layer: Layer::Outline, complete: false, chunks: None },
            LayerProgress { layer: Layer::ChunkPlanning, complete: false, chunks: Some(vec![]) },
            LayerProgress { layer: Layer::Implementation, complete: false, chunks: None },
            LayerProgress { layer: Layer::ChunkReview, complete: false, chunks: None },
            LayerProgress { layer: Layer::Integration, complete: false, chunks: None },
            LayerProgress { layer: Layer::FinalReview, complete: false, chunks: None },
            LayerProgress { layer: Layer::Analysis, complete: false, chunks: None },
        ];

        ProjectStatus {
            project_name,
            started: now,
            last_updated: now,
            current_layer: Layer::Input,
            current_chunk: None,
            current_item: None,
            iteration: 1,
            layer_progress,
            context: "Project initialized. Ready to gather input.".to_string(),
            next_action: "Capture brain dumps, research, and designs in /1-input/".to_string(),
            blockers: vec![],
            history: vec![HistoryEntry {
                timestamp: now,
                action: "Project initialized".to_string(),
            }],
        }
    }

    /// Add an entry to history
    pub fn log(&mut self, action: &str) {
        self.history.push(HistoryEntry {
            timestamp: Utc::now(),
            action: action.to_string(),
        });
        // Keep only last 20 entries
        if self.history.len() > 20 {
            self.history.remove(0);
        }
    }

    /// Mark current layer as complete
    pub fn complete_layer(&mut self) {
        let layer_idx = self.current_layer as usize - 1;
        if layer_idx < self.layer_progress.len() {
            self.layer_progress[layer_idx].complete = true;
        }
    }

    /// Advance to next layer
    pub fn advance_layer(&mut self) -> bool {
        if let Some(next) = self.current_layer.next() {
            self.complete_layer();
            self.current_layer = next;
            self.current_chunk = None;
            self.current_item = None;
            self.iteration = 1;
            self.log(&format!("Advanced to Layer {}: {}", next as u8, next.name()));
            true
        } else {
            false
        }
    }

    /// Rollback to a previous layer
    pub fn rollback_to(&mut self, target: Layer, reason: &str) {
        let target_num = target as u8;
        let current_num = self.current_layer as u8;

        if target_num < current_num {
            // Mark layers from target to current as incomplete
            for i in target_num..=current_num {
                let idx = i as usize - 1;
                if idx < self.layer_progress.len() {
                    self.layer_progress[idx].complete = false;
                }
            }

            self.current_layer = target;
            self.current_chunk = None;
            self.current_item = None;
            self.iteration = 1;
            self.log(&format!("Rolled back to Layer {}: {} - {}", target_num, target.name(), reason));
        }
    }

    /// Alias for log - add entry to history
    pub fn add_history(&mut self, action: &str) {
        self.log(action);
        self.last_updated = Utc::now();
    }

    /// Alias for complete_layer - mark a specific layer as complete
    pub fn mark_layer_complete(&mut self, layer: Layer) {
        let layer_idx = layer as usize - 1;
        if layer_idx < self.layer_progress.len() {
            self.layer_progress[layer_idx].complete = true;
        }
    }
}
