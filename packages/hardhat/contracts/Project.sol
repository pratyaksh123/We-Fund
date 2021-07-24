pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Project is Ownable {
  using SafeMath for uint256;
  enum State{
    Ongoing,
    Expired,
    Completed
  }

  // State Variables
  uint public goal; // amount in ether
  string public title;
  uint public completeAt;
  uint public deadline;
  string public description;
  State public state = State.Ongoing;
  mapping (address=>uint) contributors; // contributors
  event ProjectCompleted(address indexed contributor, uint amount, uint goal);
  event ProjectExpired(address indexed contributor, uint amount);
  event FundingRecieved(address indexed contributor, uint amount, uint currentBalance);
  event FundingRefunded(address indexed contributor, uint amount, uint currentBalance);
  event CreatorPaid(address recipient, uint amount);

  constructor(uint _goal, string memory _title, string memory _description, address _creator, uint _deadline) {
    goal = _goal;
    title = _title;
    description = _description;
    deadline = _deadline;
    transferOwnership(_creator);
  }

  modifier inState(State _state) {
    require(state == _state);
    _;
  }

  function contribute() external inState(State.Ongoing) payable {
    uint balance = address(this).balance;
    require(msg.sender != owner());
    contributors[msg.sender] = contributors[msg.sender].add(msg.value);
    emit FundingRecieved(msg.sender, msg.value, balance);
    isComplete();
  }

  function isComplete() public {
    uint balance = address(this).balance;
    if (balance >= goal){
      state = State.Completed;
      emit ProjectCompleted(msg.sender, balance, goal);
      completeAt = block.timestamp;
      payCreator();
    }
    else if(block.timestamp > deadline){
      state = State.Expired;
      completeAt = block.timestamp;
    }
  }

  function payCreator() internal inState(State.Completed) returns(bool) {
    address payable creator = payable(owner());
    uint balance = address(this).balance;
    if (creator.send(balance)){
      emit CreatorPaid(creator, balance);
      return true;
    }
    return false;
  }

  function balanceOf()public view returns(uint){
    return address(this).balance;
  }

  function fetchContributors(address _contributor) public view returns(uint){
    return contributors[_contributor];
  }
  
  function refund() public inState(State.Expired) {
    require(contributors[msg.sender] > 0);
    uint amountToRefund = contributors[msg.sender];
    contributors[msg.sender] = 0;
    if(payable(msg.sender).send(amountToRefund)){
      emit FundingRefunded(msg.sender, amountToRefund, address(this).balance);
    }else{
      contributors[msg.sender] = amountToRefund;
    }
  }

  function expireAndRefund() public inState(State.Ongoing) {
    state = State.Expired;
    refund();
  }

}