import React from 'react';
import { Modal, Card } from 'antd';
import classnames from 'classnames';
import styles from './index.module.less';
import { AgentService } from '@/store/useAgentStore';

interface AgentSelectionModalProps {
  visible: boolean;
  onCancel: () => void;
  agents: AgentService[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

const AgentSelectionModal: React.FC<AgentSelectionModalProps> = ({
  visible,
  onCancel,
  agents,
  selectedAgentId,
  onSelectAgent,
}) => {
  return (
    <Modal
      title="选择智能体"
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      width={800}
      className={styles.modal}
    >
      <div className={styles.cardContainer}>
        {agents.map(agent => (
          <Card
            key={agent.service_id}
            className={classnames(styles.agentCard, {
              [styles.selected]: selectedAgentId === agent.service_id,
            })}
            onClick={() => {
              onSelectAgent(agent.service_id);
              onCancel(); // 选择后关闭弹窗
            }}
            hoverable
          >
            <div className={styles.cardContent}>
              <h3 className={styles.agentName}>{agent.agent_name}</h3>
              <p className={styles.agentDesc}>{agent.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </Modal>
  );
};

export default AgentSelectionModal;