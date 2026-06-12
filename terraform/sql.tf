resource "google_sql_database_instance" "postgres" {
  name             = "cvpro-db-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-1-3840"
  }
  deletion_protection = true
}

resource "google_sql_database" "database" {
  name     = "cvpro"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "users" {
  name     = "postgres"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
