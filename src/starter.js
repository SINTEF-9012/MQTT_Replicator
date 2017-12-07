import Client from './client.js';

// Each client is a process environment variable
const client_env_match = /^MQTT_REPLICATOR_CLIENT_(.+)$/;

export default function starter() {

    const clients = [];
    for (let env in process.env) {
        let m = env.match(client_env_match);
        if (!m || env.endsWith('_CONFIG')) continue;

        let name = m[1];
        let path = process.env[env];

        // Loading the configuration
        let config = {};
        let configPath = env + '_CONFIG';
        if (process.env[configPath]) {
            try {
                config = JSON.parse(process.env[configPath]);
            } catch (e) {
                console.log(`Unable to parse the configuration ${configPath}: ${e.message}`);
            }
        }

        clients.push(new Client(name, path, config));
    }
    if (clients.length === 0) {
        console.log("No client has been configured.");
    }
    return clients;
}