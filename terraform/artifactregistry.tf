resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "cvpro-repo"
  description   = "Docker repository for CVPRO backend"
  format        = "DOCKER"
}
