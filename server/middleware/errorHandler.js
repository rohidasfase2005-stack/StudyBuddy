import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: true, message: 'File is too large.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: true, message: err.field || 'Invalid file type.' });
    }
    return res.status(400).json({ error: true, message: 'File upload error.' });
  }

  // Handle validation errors or custom errors
  if (err.status) {
    return res.status(err.status).json({ error: true, message: err.message });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    error: true,
    message: isProduction ? 'Internal Server Error' : err.message || 'Unknown error occurred',
    ...(isProduction ? {} : { stack: err.stack })
  });
};
