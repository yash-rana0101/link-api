use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct TrustScoreRequest {
    pub verified_experiences: u32,
    pub peer_confirmations: u32,
    pub connections: u32,
    pub reports: u32,
}

#[derive(Debug, Serialize)]
pub struct TrustScoreResponse {
    pub trust_score: i32,
}
