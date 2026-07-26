export const MEBIBYTE = 1024 * 1024;

export const MAX_MOD_FILE_BYTES = 500 * MEBIBYTE;
export const MAX_IMAGE_FILE_BYTES = 2 * MEBIBYTE;
export const MAX_GALLERY_FILES = 10;

// Mỗi request chunk luôn thấp hơn nhiều so với giới hạn request 100 MB
// thường gặp ở lớp reverse proxy/CDN.
export const MOD_UPLOAD_CHUNK_BYTES = 16 * MEBIBYTE;

// Request tạo mod sau khi upload chunk chỉ còn metadata, cover và gallery.
export const MAX_MOD_METADATA_REQUEST_BYTES =
  MAX_IMAGE_FILE_BYTES * (MAX_GALLERY_FILES + 1) +
  4 * MEBIBYTE;
