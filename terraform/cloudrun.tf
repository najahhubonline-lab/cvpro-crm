resource "google_cloud_run_v2_service" "backend" {
  name     = "cvpro-backend"
  location = var.region

  template {
    session_affinity = true

    vpc_access {
      network_interfaces {
        network    = google_compute_network.vpc_network.id
        subnetwork = google_compute_subnetwork.vpc_subnetwork.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/cvpro-repo/backend:latest"
      
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "DB_SOCKET_PATH"
        value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
      env {
        name  = "DB_USER"
        value = "postgres"
      }
      env {
        name  = "DB_NAME"
        value = "cvpro"
      }
      env {
        name  = "MEDIA_BUCKET_NAME"
        value = google_storage_bucket.media_bucket.name
      }
      
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = "6379"
      }
      env {
        name  = "REDIS_PASSWORD"
        value = google_redis_instance.cache.auth_string
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.whatsapp_token.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_version.jwt_secret_data,
    google_secret_manager_secret_version.whatsapp_token_data,
    google_secret_manager_secret_version.db_password_data,
    google_secret_manager_secret_version.gemini_api_key_data
  ]
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "cvpro-worker"
  location = var.region

  template {
    annotations = {
      "run.googleapis.com/cpu-throttling" = "false"
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    vpc_access {
      network_interfaces {
        network    = google_compute_network.vpc_network.id
        subnetwork = google_compute_subnetwork.vpc_subnetwork.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/cvpro-repo/backend:latest"
      
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name  = "WORKER_MODE"
        value = "true"
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "DB_SOCKET_PATH"
        value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
      env {
        name  = "DB_USER"
        value = "postgres"
      }
      env {
        name  = "DB_NAME"
        value = "cvpro"
      }
      env {
        name  = "MEDIA_BUCKET_NAME"
        value = google_storage_bucket.media_bucket.name
      }
      
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = "6379"
      }
      env {
        name  = "REDIS_PASSWORD"
        value = google_redis_instance.cache.auth_string
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.whatsapp_token.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_version.jwt_secret_data,
    google_secret_manager_secret_version.whatsapp_token_data,
    google_secret_manager_secret_version.db_password_data,
    google_secret_manager_secret_version.gemini_api_key_data
  ]
}

resource "google_cloud_run_v2_job" "migrate" {
  name     = "cvpro-migrate"
  location = var.region

  template {
    template {
      vpc_access {
        network_interfaces {
          network    = google_compute_network.vpc_network.id
          subnetwork = google_compute_subnetwork.vpc_subnetwork.id
        }
        egress = "PRIVATE_RANGES_ONLY"
      }
      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.postgres.connection_name]
        }
      }
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/cvpro-repo/backend:latest"
        
        command = ["/bin/sh", "-c"]
        args    = ["DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME?host=$DB_SOCKET_PATH&connection_limit=5\" npx prisma migrate deploy"]
        
        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "DB_SOCKET_PATH"
          value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }
        env {
          name  = "DB_USER"
          value = "postgres"
        }
        env {
          name  = "DB_NAME"
          value = "cvpro"
        }
      }
    }
  }
  depends_on = [
    google_sql_database_instance.postgres,
    google_secret_manager_secret_version.db_password_data
  ]
}
