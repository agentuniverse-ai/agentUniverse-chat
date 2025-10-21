import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface AgentService {
  agent_name: string;
  description: string;
  service_id: string;
}

interface AgentState {
  agentList: AgentService[];
  selectedAgentId?: string;
  fetchAgentList: () => Promise<void>;
  setSelectedAgentId: (id: string) => void;
}

const useAgentStore = create<AgentState>()(
  immer((set, get) => ({
    agentList: [],
    selectedAgentId: undefined,

    fetchAgentList: async () => {
      try {
        const response = await fetch('http://127.0.0.1:8888/agent/list', {
          method: 'GET',
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          set(state => {
            state.agentList = data.data;
            // 默认选中第一个服务，如果存在的话
            if (data.data.length > 0) {
              state.selectedAgentId = data.data[0].service_id;
            }
          });
        } else {
          console.error('Failed to fetch agent list:', data);
        }
      } catch (error) {
        console.error('Error fetching agent list:', error);
      }
    },

    setSelectedAgentId: (id: string) => {
      set(state => {
        state.selectedAgentId = id;
      });
    },
  }))
);

export default useAgentStore;