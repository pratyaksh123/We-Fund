import React, { useState } from "react";
import {
  useContractLoader,
  useContractReader,
  useEventListener,
  useBalance,
  useUserSigner,
  useGasPrice,
} from "../hooks";
import { Account, Balance } from "../components";

import "./Project.css";

import { Card } from "antd";
import { EditOutlined, EllipsisOutlined, SettingOutlined } from "@ant-design/icons";
import Countdown from "react-countdown";
import { ERC20ABI } from "../contracts/external_contracts";
import { Input } from "antd";
import { Transactor } from "../helpers";
import { formatEther, parseEther } from "@ethersproject/units";

const { Search } = Input;
const { Meta } = Card;

const Project = ({ address, localProvider, parentDefinedState, userSigner }) => {
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
  const stakerContractBalance = useBalance(localProvider, readContract && readContract.Project.address);
  const event1 = useEventListener(readContract, "Project", "ProjectCompleted");
  const event2 = useEventListener(readContract, "Project", "FundingRecieved");

  console.log(event1, event2);

  const Completionist = () => <span>You are good to go!</span>;

  const renderer = ({ hours, minutes, seconds, completed, days }) => {
    if (completed) {
      // Render a completed state
      return <Completionist />;
    } else {
      // Render a countdown
      return (
        <span>
          {days} Days, {hours} Hours, {minutes} Minutes and {seconds} Seconds remaining
        </span>
      );
    }
  };

  const onSearch = value => {
    writeContract.Project.contribute({ value: parseEther(value.toString()) });
  };

  return (
    <>
      <Card
        className="project-card"
        hoverable={true}
        actions={[<SettingOutlined key="setting" />, <EditOutlined key="edit" />, <EllipsisOutlined key="ellipsis" />]}
      >
        <Meta title={title} description={description} />
        {deadline && <Countdown date={deadline.toNumber() * 1000} renderer={renderer} />}
        {creator && <Account address={creator} localProvider={localProvider} />}
        {goal && (
          <p>
            {<Balance balance={stakerContractBalance} fontSize={64} />}/{<Balance balance={goal} fontSize={64} />}
          </p>
        )}
        <Search placeholder="Input Amount in ETH" allowClear enterButton="Fund" size="small" onSearch={onSearch} />
      </Card>
    </>
  );
};

const gridStyle = {
  width: "80%",
  textAlign: "center",
};

export default Project;
