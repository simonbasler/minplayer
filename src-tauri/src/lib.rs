use base64::prelude::*;
use lofty::prelude::*;
use lofty::probe::Probe;
use std::path::Path;

#[derive(serde::Serialize)]
struct AudioMetadata {
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<u64>,
    cover: Option<String>,
}

// Validate that the path is safe and allowed
fn is_valid_audio_path(path: &Path) -> bool {
    // Check if path exists
    if !path.exists() {
        return false;
    }

    // Check if it's a file (not a directory)
    if !path.is_file() {
        return false;
    }

    // Validate file extension
    if let Some(ext) = path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        matches!(
            ext_lower.as_str(),
            "mp3" | "m4a" | "flac" | "wav" | "ogg" | "opus" | "aac" | "wma"
        )
    } else {
        false
    }
}

#[tauri::command]
fn get_metadata(path: String) -> Option<AudioMetadata> {
    let path = Path::new(&path);

    // Validate path before processing
    if !is_valid_audio_path(path) {
        return None;
    }

    let tagged_file_res = Probe::open(path).ok().and_then(|probe| probe.read().ok());

    if let Some(tagged_file) = tagged_file_res {
        let tag = tagged_file
            .primary_tag()
            .or_else(|| tagged_file.first_tag());
        let properties = tagged_file.properties();

        let mut cover_base64 = None;
        if let Some(t) = tag {
            if let Some(picture) = t.pictures().first() {
                let b64 = BASE64_STANDARD.encode(picture.data());
                let mime = picture
                    .mime_type()
                    .map(|m| m.as_str())
                    .unwrap_or("image/jpeg");
                cover_base64 = Some(format!("data:{};base64,{}", mime, b64));
            }
        }

        return Some(AudioMetadata {
            title: tag.and_then(|t| t.title().map(|s| s.into_owned())),
            artist: tag.and_then(|t| t.artist().map(|s| s.into_owned())),
            album: tag.and_then(|t| t.album().map(|s| s.into_owned())),
            duration: Some(properties.duration().as_secs()),
            cover: cover_base64,
        });
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
