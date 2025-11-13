class Logger {
  log(message) {
    console.log(`[${new Date().toISOString()}] [LOG] ${message}`);
  }

  info(message) {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
  }

  warn(message) {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`);
  }

  error(message, error = null) {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }

  debug(message) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`);
    }
  }
}

module.exports = Logger;