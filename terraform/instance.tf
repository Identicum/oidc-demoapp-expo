resource "google_service_account" "idp_service_account" {
  account_id   = "play-store-service-account"
  display_name = "Play Store Service Account"
}

resource "google_service_account_key" "idp_service_account_key" {
  service_account_id = google_service_account.idp_service_account.name
  public_key_type    = "TYPE_X509_PEM_FILE"
}

resource "local_file" "play-store-values" {
  filename = "google-service-account.json"
  content  = base64decode(google_service_account_key.idp_service_account_key.private_key)
}