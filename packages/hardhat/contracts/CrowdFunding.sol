pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT
import "./Project.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CrowdFunding {
    using SafeMath for uint256;
    Project[] public projects;
    event NewProjectCreated(uint goal, string title, string description, uint durationInDays);

    function createNewProject(uint goal, string memory title, string memory description, uint durationInDays) public {
        uint raiseUntil = block.timestamp.add(durationInDays.mul(1 days));
        Project newProject = new Project(goal, title, description, msg.sender, raiseUntil);
        projects.push(newProject);
        emit NewProjectCreated(goal, title, description, raiseUntil);
    }

    function returnAllProjects() external view returns(Project[] memory){
        return projects;
    }
}