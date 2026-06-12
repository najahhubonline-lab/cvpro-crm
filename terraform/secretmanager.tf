resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "cvpro-jwt-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret_data" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = "change-me-in-gcp-console"
  
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "whatsapp_token" {
  secret_id = "cvpro-whatsapp-token"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "whatsapp_token_data" {
  secret      = google_secret_manager_secret.whatsapp_token.id
  secret_data = "change-me-in-gcp-console"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "cvpro-db-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password_data" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
  
  lifecycle {
    ignore_changes = [secret_data]
  }
}

# CRITICAL FIX: Store Vertex AI API Key securely
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "cvpro-gemini-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "gemini_api_key_data" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = "change-me-in-gcp-console"
  
  lifecycle {
    ignore_changes = [secret_data]
  }
}
