import { createApp } from './app.mjs';

const { server, config } = createApp();
server.on('error', (error) => { console.error(`Server could not start: ${error.message}`); process.exitCode = 1; });
server.listen(config.port, config.host, () => {
  console.log(`Aurora Atlas: ${config.publicUrl}`);
  console.log(`Admin: ${config.publicUrl}/admin.html`);
  console.log(`Payments: ${config.stripeEnabled ? 'Stripe enabled' : 'Stripe not configured'}; pay on delivery ${config.allowCod ? 'enabled' : 'disabled'}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); server.closeIdleConnections(); });
