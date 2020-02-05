import loggerModule from "./logger";
import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  // makeBrowsePath,
  ClientSubscription,
  TimestampsToReturn,
  MonitoringParametersOptions,
  ReadValueIdLike,
  ClientMonitoredItem,
  DataValue,
  OPCUAClientOptions,
} from "node-opcua";

const logger = loggerModule("OPCUA");

(async (): Promise<void> => {
  const options: OPCUAClientOptions = {
    applicationName: "MyClient",
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
  };
  const client = OPCUAClient.create(options);
  const endpointUrl = "opc.tcp://192.168.35.71:4840";

  await client.connect(endpointUrl);
  logger.logInfo("Connected");

  const session = await client.createSession();
  logger.logInfo("session created");

  // setInterval(async (): Promise<void> => {
  //   const dataValue = await session.readVariableValue("ns=2;s=GVL_OPC.G_stHMI.stTemperatureSensors.q_rMainHall");
  //   logger.logInfo(dataValue.value.value);
  // }, 1000);

  const subscription = ClientSubscription.create(session, {
    requestedPublishingInterval: 1000,
    requestedLifetimeCount: 100,
    requestedMaxKeepAliveCount: 10,
    maxNotificationsPerPublish: 100,
    publishingEnabled: true,
    priority: 10,
  });
  logger.logInfo("subscription created");

  subscription
    .on("started", () => {
      logger.logInfo(`Subscription started for 2 seconds - subscriptionId=${subscription.subscriptionId}`);
    })
    // .on("keepalive", () => {
    //   logger.logWarning("keepalive");
    // })
    .on("terminated", () => {
      logger.logError("terminated");
    });

  const itemToMonitor: ReadValueIdLike = {
    nodeId: "ns=2;s=GVL_OPC.G_stHMI.stTemperatureSensors.q_rMainHall",
    attributeId: AttributeIds.Value,
  };
  const parameters: MonitoringParametersOptions = {
    samplingInterval: 100,
    discardOldest: true,
    queueSize: 10,
  };

  const monitoredItem = ClientMonitoredItem.create(subscription, itemToMonitor, parameters, TimestampsToReturn.Both);
  logger.logInfo("item monitoring started");

  monitoredItem.on("changed", (dataValue: DataValue) => {
    logger.logInfo(dataValue.value.value);
  });
})();
