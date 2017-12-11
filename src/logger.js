import loglevelMessagePrefix from 'loglevel-message-prefix';

const log = require('loglevel');
log.enableAll();

loglevelMessagePrefix(log, {
    prefixes: ['timestamp', 'level']
})
export default log;