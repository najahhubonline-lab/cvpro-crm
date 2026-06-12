output "cloud_run_url" {
  description = "The URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "database_ip" {
  description = "The public IP of the PostgreSQL database"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "redis_host" {
  description = "The internal IP of the Redis instance"
  value       = google_redis_instance.cache.host
}
