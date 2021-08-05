import React, { useState, useEffect } from "react";
import { useContractLoader, useContractReader, useBalance } from "../hooks";
import { Account } from "../components";
import "./Project.css";
import { Card, Progress, Typography, Button, Modal } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import Countdown from "react-countdown";
import { ERC20ABI } from "../contracts/external_contracts";
import { Input } from "antd";
import { utils } from "ethers";
import { parseEther } from "@ethersproject/units";
import { NETWORKS } from "../constants";
const { Search } = Input;
const { Meta } = Card;

const Project = ({ address, localProvider, parentDefinedState, tx, userSigner, userAddress, price }) => {
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const contract_defination = {
    3: {
      contracts: {
        Project: {
          address: address,
          abi: ERC20ABI,
        },
      },
    },
  };
  // TODO: increate the poll time for production
  const readContract = useContractLoader(localProvider, { externalContracts: contract_defination });
  const writeContract = useContractLoader(userSigner, { externalContracts: contract_defination });
  const title = useContractReader(readContract, "Project", "title");
  const description = useContractReader(readContract, "Project", "description");
  const goal = useContractReader(readContract, "Project", "goal");
  const deadline = useContractReader(readContract, "Project", "deadline");
  const state = useContractReader(readContract, "Project", "state");
  const [localState, setLocalState] = useState(state);
  const creator = useContractReader(readContract, "Project", "owner");
  const contractBalance = useBalance(localProvider, readContract && readContract.Project.address);
  const contributorBalance = useContractReader(readContract, "Project", "fetchContributors", [userAddress]);

  const ProjectExpiredComponent = () => {
    return (
      <Typography.Text type="danger">
        <span>
          <ExclamationCircleOutlined /> Project Expired
        </span>
      </Typography.Text>
    );
  };
  const renderer = ({ hours, minutes, seconds, completed, days }) => {
    if (completed) {
      // Render a completed state
      setLocalState(1);
      if (state !== 1) {
        return <ProjectExpiredComponent />;
      }
    } else {
      // Render a countdown
      return (
        <span>
          {days} Days, {hours} Hours, {minutes} Minutes and {seconds} Seconds remaining
        </span>
      );
    }
  };

  const fund = value => {
    if (creator == userAddress) {
      alert("You cannot fund your own project");
      return;
    }
    const formatedValue = value / price;
    tx(writeContract.Project.contribute({ value: parseEther(formatedValue.toFixed(4)) }));
  };
  // console.log({ title, description, goal, deadline, state, creator, contractBalance });
  useEffect(() => {
    if (
      readContract !== undefined &&
      writeContract !== undefined &&
      title !== undefined &&
      description !== undefined &&
      goal !== undefined &&
      deadline !== undefined &&
      state !== undefined &&
      creator !== undefined &&
      contractBalance !== undefined
    ) {
      setLocalState(state);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [readContract, writeContract, title, description, goal, deadline, state, creator, contractBalance]);

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleRefund = () => {
    if (state === 0 && localState === 1) {
      tx(writeContract.Project.expireAndRefund());
    }
  };

  return (
    <div className="project-card">
      <Card
        bordered={true}
        loading={loading}
        hoverable={true}
        title={
          <div>
            {creator && (
              <div>
                <Typography.Text>Contract Address</Typography.Text>
                <Account
                  address={address}
                  localProvider={localProvider}
                  price={price}
                  blockExplorer={NETWORKS.ropsten.blockExplorer}
                />
              </div>
            )}
          </div>
        }
        extra={
          <div>
            {creator && (
              <div>
                <Typography.Text>Created By</Typography.Text>
                <Account
                  address={creator}
                  localProvider={localProvider}
                  price={price}
                  blockExplorer={NETWORKS.ropsten.blockExplorer}
                />
              </div>
            )}
          </div>
        }
      >
        <Meta title={title} description={description} />
        {deadline && localState === 0 && <Countdown date={deadline.toNumber() * 1000} renderer={renderer} />}
        {goal && localState === 0 && (
          <>
            <Typography.Title level={4}>
              ${(parseFloat(utils.formatEther(contractBalance)) * price).toFixed(4)} / $
              {(parseFloat(utils.formatEther(goal)) * price).toFixed(4)} Raised{" "}
            </Typography.Title>
            <Progress
              status="active"
              showInfo={true}
              percent={
                parseFloat(
                  parseFloat(utils.formatEther(contractBalance)) / parseFloat(utils.formatEther(goal)),
                ).toFixed(2) * 100
              }
            />
          </>
        )}
        {localState === 1 && (
          <>
            <ProjectExpiredComponent />
            <Button
              size="small"
              type="link"
              onClick={() => {
                setModalVisible(true);
              }}
            >
              Claim Refund ( For Contributors )
            </Button>
          </>
        )}
        {localState === 2 && goal && (
          <>
            <Typography.Text type="success">
              <CheckCircleOutlined /> Project Funded Successfully
            </Typography.Text>
            <Typography.Text type="primary"> ${parseFloat(utils.formatEther(goal)).toFixed(4)} raised</Typography.Text>
          </>
        )}
        {localState === 0 && (
          <Search placeholder="Input Amount in USD" allowClear enterButton="Fund" size="small" onSearch={fund} />
        )}
        <Modal title="Claim your refund" visible={isModalVisible} footer={null} onCancel={handleCancel}>
          Total contributed by you - {contributorBalance && <p>${utils.formatEther(contributorBalance)}</p>}
          {contributorBalance && utils.formatEther(contributorBalance) > 0 && (
            <Button size="small" type="primary" onClick={handleRefund}>
              Claim
            </Button>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default Project;
