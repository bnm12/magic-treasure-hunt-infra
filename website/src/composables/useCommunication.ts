import { onUnmounted } from "vue";
import {
  createSpotTransport,
  type SpotTransport,
} from "./spotTransport";
import { createBluetoothChannel } from "./useBluetooth";
import { createSerialChannel } from "./useSerial";

export function useCommunication(): SpotTransport & {
  connectSerial(): Promise<void>;
  connectBluetooth(): Promise<void>;
} {
  const transport = createSpotTransport({
    serial: createSerialChannel,
    bluetooth: createBluetoothChannel,
  });

  onUnmounted(() => {
    void transport.disconnect();
  });

  return {
    ...transport,
    connectSerial: () => transport.connect("serial"),
    connectBluetooth: () => transport.connect("bluetooth"),
  };
}
