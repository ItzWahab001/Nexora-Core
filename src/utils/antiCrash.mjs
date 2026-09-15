import colors from 'colors';
import logger from './logger.mjs';
export default () => {
  process.on('multipleResolves', (type, promise, reason) => {
    // console.log('✯ |=== [AntiCrash] | [multipleResolves] | [start] ===| ✯'.yellow.dim);
    // // console.log(type, promise, reason);
    // console.log('✯ |=== [AntiCrash] | [multipleResolves] | [end] ===| ✯`.yellow.dim);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.log(`✯ |=== [AntiCrash] | [unhandledRejection] | [start] ====| ✯`.yellow.dim);
    logger(reason, "error")
    // console.log(String(reason.stack ? reason.stack : reason).gray);
    console.log('✯ |=== [AntiCrash] | [unhandledRejection] | [end] ===| ✯'.yellow.dim);
  });
  process.on('rejectionHandled', (promise) => {
    console.log('✯ |=== [AntiCrash] | [rejectionHandled] | [start] ===| ✯'.yellow.dim);
    logger(promise, "error")
    console.log('✯ |=== [AntiCrash] | [rejectionHandled] | [end] ===| ✯'.yellow.dim);
  })
  process.on("uncaughtException", (err, origin) => {
    console.log('✯ |=== [AntiCrash] | [uncaughtException] | [start] ===| ✯'.yellow.dim);
    logger(err, "error")
    console.log('✯ |=== [AntiCrash] | [uncaughtException] | [end] ===| ✯'.yellow.dim);
  });
  process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log('✯ |=== [AntiCrash] | [uncaughtExceptionMonitor] | [start] ===| ✯'.yellow.dim);
    logger(err, "error")
    console.log('✯ |=== [AntiCrash] | [uncaughtExceptionMonitor] | [end] ===| ✯'.yellow.dim);
  });
}
