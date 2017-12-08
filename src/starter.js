import Client from './client.js';

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
                        console.log(`Unable to parse the configuration ${configPath}: ${e.message}`);
                    }
                }

                clients.push(new Client(name, value, config));

                break;
            case 'TOPIC':
                const topic = {
                    name,
                    topic: value,
                    qos: parseInt(process.env[`MQTTREP_QOS_${name}`] || 1, 10),
                    persistent: process.env[`MQTTREP_PERSISTENT_${name}`] === "true",
                    ttl: parseInt(process.env[`MQTTREP_TTL_${name}`] || 1200, 10),
                };

                const whitelist = (process.env[`MQTTREP_WHITELIST_${name}`] || '')
                    .split(',').map(s => s.trim()).filter(s => s.length);
                const blacklist = (process.env[`MQTTREP_BLACKLIST_${name}`] || '')
                    .split(',').map(s => s.trim()).filter(s => s.length);

                if (whitelist.length) {
                    topic.whitelist = new Set(whitelist);
                }

                if (blacklist.length) {
                    topic.blacklist = new Set(blacklist);
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