use serde::{Deserialize, Serialize};

fn default_min_confirmations() -> u32 {
    2
}

#[derive(Debug, Deserialize)]
pub struct VerificationResolveRequest {
    pub confirmations: u32,
    #[serde(default = "default_min_confirmations")]
    pub min_confirmations: u32,
    #[serde(default)]
    pub artifact: bool,
    #[serde(default)]
    pub rejections: u32,
}

#[derive(Debug, Serialize)]
pub struct VerificationResolveResponse {
    pub status: String,
    pub consensus_reached: bool,
}
