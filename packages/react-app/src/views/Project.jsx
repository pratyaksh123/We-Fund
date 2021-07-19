import React, { useState, useEffect } from "react";
import { useContractLoader, useContractReader, useBalance } from "../hooks";
import { Account } from "../components";
import "./Project.css";
import { Card, Progress, Typography } from "antd";
import {
  EditOutlined,
  EllipsisOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import Countdown from "react-countdown";
import { ERC20ABI } from "../contracts/external_contracts";
import { Input } from "antd";
import { utils } from "ethers";
import { parseEther } from "@ethersproject/units";

const { Search } = Input;
const { Meta } = Card;

const Project = ({ address, localProvider, parentDefinedState, userSigner }) => {
  const [loading, setLoading] = useState(false);
  const contract_defination = {
    1337: {
      contracts: {
        Project: {
          address: address,
          abi: ERC20ABI,
        },
      },
    },
  };

  const readContract = useContractLoader(localProvider, { externalContracts: contract_defination });
  const writeContract = useContractLoader(userSigner, { externalContracts: contract_defination });
  const title = useContractReader(readContract, "Project", "title");
  const description = useContractReader(readContract, "Project", "description");
  const goal = useContractReader(readContract, "Project", "goal");
  const deadline = useContractReader(readContract, "Project", "deadline");
  const state = useContractReader(readContract, "Project", "state");
  const creator = useContractReader(readContract, "Project", "owner");
  const contractBalance = useBalance(localProvider, readContract && readContract.Project.address);
  // const event1 = useEventListener(readContract, "Project", "ProjectCompleted");
  // const event2 = useEventListener(readContract, "Project", "FundingRecieved");

  const ProjectExpiredCompoenent = () => {
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
      if (state !== 1) {
        return <ProjectExpiredCompoenent />;
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
    writeContract.Project.contribute({ value: parseEther(value.toString()) });
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
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [readContract, writeContract, title, description, goal, deadline, state, creator, contractBalance]);

  return (
    <div className="project-card">
      <Card
        bordered={true}
        loading={loading}
        hoverable={true}
        actions={[<SettingOutlined key="setting" />, <EditOutlined key="edit" />, <EllipsisOutlined key="ellipsis" />]}
      >
        <Meta title={title} description={description} />
        {deadline && state === 0 && <Countdown date={deadline.toNumber() * 1000} renderer={renderer} />}
        {creator && <Account address={creator} localProvider={localProvider} />}
        {goal && state === 0 && (
          <Typography.Title level={3}>
            {parseFloat(utils.formatEther(contractBalance)).toFixed(4)} /{" "}
            {parseFloat(utils.formatEther(goal)).toFixed(4)} ETH Raised{" "}
          </Typography.Title>
        )}
        {goal && state === 0 && (
          <>
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
        {state === 1 && <ProjectExpiredCompoenent />}
        {state === 2 && (
          <Typography.Text type="success">
            <CheckCircleOutlined /> Project Funded Successfully
          </Typography.Text>
        )}
        {state === 0 && (
          <Search placeholder="Input Amount in ETH" allowClear enterButton="Fund" size="small" onSearch={fund} />
        )}
      </Card>
    </div>
  );
};

export default Project;
