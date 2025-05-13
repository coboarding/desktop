terraform {
  required_version = ">= 1.0.0"
}

# Prosty provider lokalny dla demonstracji
provider "local" {}

# Konfiguracja lokalnego środowiska
resource "local_file" "app_config" {
  content  = jsonencode({
    app_name     = "VideoChat LLM",
    version      = "1.0.0",
    port         = 3000,
    novnc_port   = 6080,
    k3s_enabled  = true,
    models_path  = "${path.module}/models"
  })
  filename = "${path.module}/config.json"
}

# Symulacja tworzenia katalogu dla modeli
resource "local_file" "directory_marker" {
  content  = "Ten katalog zawiera modele LLM, TTS i STT"
  filename = "${path.module}/models/README.md"

  provisioner "local-exec" {
    command = <<-EOT
      mkdir -p ${path.module}/models/llm
      mkdir -p ${path.module}/models/tts
      mkdir -p ${path.module}/models/stt
    EOT
  }
}

# Symulacja konfiguracji sieci
resource "local_file" "network_config" {
  content  = jsonencode({
    bind_address = "0.0.0.0",
    app_port     = 3000,
    novnc_port   = 6080,
    use_ssl      = false
  })
  filename = "${path.module}/network.json"
}

# Symulacja przygotowania skryptów startowych
resource "local_file" "start_script" {
  content  = <<-EOT
    #!/bin/bash
    
    # Skrypt startowy generowany przez Terraform
    echo "Uruchamianie VideoChat LLM..."
    
    # Zmienne środowiskowe
    export APP_PORT=3000
    export NOVNC_PORT=6080
    export K3S_ENABLED=true
    
    # Uruchomienie aplikacji
    ./bin/start-app
  EOT
  filename = "${path.module}/start.sh"

  provisioner "local-exec" {
    command = "chmod +x ${path.module}/start.sh"
  }
}

# Wyświetlenie informacji po zakończeniu
output "app_config" {
  value = "Konfiguracja zapisana w pliku ${local_file.app_config.filename}"
}

output "app_start" {
  value = "Uruchom aplikację za pomocą skryptu ${local_file.start_script.filename}"
}