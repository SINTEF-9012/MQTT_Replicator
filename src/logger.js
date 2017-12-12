import loglevelMessagePrefix from 'loglevel-message-prefix';

const log = require('loglevel');

if (process.env.NODE_ENV !== 'production') {
    log.enableAll();
} else {
    log.setLevel("info");
    loglevelMessagePrefix(log, {
        prefixes: ['timestamp', 'level']
    });
}

export default log;