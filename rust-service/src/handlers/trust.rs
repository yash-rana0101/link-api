use actix_web::{web, HttpResponse, Responder};

use crate::models::trust::{TrustScoreRequest, TrustScoreResponse};

pub async fn calculate(payload: web::Json<TrustScoreRequest>) -> impl Responder {
    let verified_component = (payload.verified_experiences as i32) * 20;
    let confirmation_component = (payload.peer_confirmations as i32) * 10;
    let connection_component = (payload.connections as i32) * 5;
    let report_penalty = (payload.reports as i32) * 30;

    let score = (verified_component + confirmation_component + connection_component - report_penalty)
        .clamp(0, 100);

    HttpResponse::Ok().json(TrustScoreResponse { trust_score: score })
}
