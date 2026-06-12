resource "google_redis_instance" "cache" {
  name               = "cvpro-redis"
  memory_size_gb     = 1
  region             = var.region
  redis_version      = "REDIS_7_0"
  authorized_network = google_compute_network.vpc_network.id
  connect_mode       = "DIRECT_PEERING"
  auth_enabled       = true
}
