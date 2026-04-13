use actix_web::{web, App, HttpServer};

mod handlers;
mod models;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/health", web::get().to(handlers::health::health))
            .route("/trust/calculate", web::post().to(handlers::trust::calculate))
            .route(
                "/verification/resolve",
                web::post().to(handlers::verification::resolve),
            )
    })
    .bind(("0.0.0.0", 5000))?
    .run()
    .await
}
