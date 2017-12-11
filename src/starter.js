import Client from './client.js';
import log from './logger.js';

// Each client is a process environment variable
const mqttrep_env_match = /^MQTTREP_(CLIENT|TOPIC)_(\w+)$/;

export default function starter() {

    const clients = [];
    const topics = [];
    for (let env in process.env) {
        const m = env.match(mqttrep_env_match);

        // Ignore environments variable which are not for us
        // or configuration variables
        if (!m) continue;

        const action = m[1];
        const name = m[2];
        const value = process.env[env];

        switch (action) {
            case 'CLIENT':
                // Loading the configuration
                let config = {};
                let configPath = `MQTTREP_CONFIG_${name}`;
                if (process.env[configPath]) {
                    try {
                        config = JSON.parse(process.env[configPath]);
                    } catch (e) {
                        log.error(`Unable to parse the configuration ${configPath}: ${e.message}`);
                    }
                }

                clients.push(new Client(name, value, config));

                break;
            case 'TOPIC':
                const topic = {
                    name,
                    topic: value,
                    qos: parseInt(process.env[`MQTTREP_QOS_${name}`] || 1, 10),
                    retain: process.env[`MQTTREP_RETAIN_${name}`] === "true",
                    ttl: parseInt(process.env[`MQTTREP_TTL_${name}`] || 0, 10) * 1000,
                    nosub: process.env[`MQTTREP_NOSUB_${name}`] === "true",
                };

                const subscribeWhitelist = (process.env[`MQTTREP_SUBSCRIBE_WHITELIST_${name}`] || '')
                    .split(',').map(s => s.trim()).filter(s => s.length);
                const subscribeBlacklist = (process.env[`MQTTREP_SUBSCRIBE_BLACKLIST_${name}`] || '')
                    .split(',').map(s => s.trim()).filter(s => s.length);
                const publishWhitelist = (process.env[`MQTTREP_PUBLISH_WHITELIST_${name}`] || '')
                    .split(',').map(s => s.trim()).filter(s => s.length);
                const publishBlacklist = (process.env[`MQTTREP_PUBLISH_BLACKLIST_${name}`] || '')
                    .split(',').map(s => s.trim()).filter(s => s.length);

                if (subscribeWhitelist.length) {
                    topic.subscribeWhitelist = new Set(subscribeWhitelist);
                }

                if (subscribeBlacklist.length) {
                    topic.subscribeBlacklist = new Set(subscribeBlacklist);
                }

                if (publishWhitelist.length) {
                    topic.publishWhitelist = new Set(publishWhitelist);
                }

                if (publishBlacklist.length) {
                    topic.publishBlacklist = new Set(publishBlacklist);
                }

                topics.push(topic);
                break;
        }

    }
    if (clients.length === 0) {
        console.log("No client has been configured.");
    }

    const mergeFrequencyHz = parseFloat(process.env.MQTT_REPLICATOR_MERGE_FREQUENCY || 1);

    return {
        clients,
        mergeFrequencyHz,
        topics,
    };
}