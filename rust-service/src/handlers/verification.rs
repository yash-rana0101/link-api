use actix_web::{web, HttpResponse, Responder};

use crate::models::verification::{VerificationResolveRequest, VerificationResolveResponse};

pub async fn resolve(payload: web::Json<VerificationResolveRequest>) -> impl Responder {
    let confirmations_with_artifact_bonus = if payload.artifact {
        payload.confirmations + 1
    } else {
        payload.confirmations
    };

    let status = if confirmations_with_artifact_bonus >= payload.min_confirmations {
        "PEER_VERIFIED"
    } else if payload.rejections >= payload.min_confirmations {
        "FLAGGED"
    } else {
        "SELF_CLAIMED"
    };

    HttpResponse::Ok().json(VerificationResolveResponse {
        status: status.to_string(),
        consensus_reached: status == "PEER_VERIFIED",
    })
}
