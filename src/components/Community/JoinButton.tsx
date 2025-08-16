import React from "react";
import { Button } from "@chakra-ui/react";
import { Community } from "../../atoms/communitiesAtom";

type JoinButtonProps = {
  community: Community;
  isJoined: boolean;
  onJoinLeave: (community: Community, isJoined: boolean) => void;
};

const JoinButton: React.FC<JoinButtonProps> = ({ community, isJoined, onJoinLeave }) => {
  return (
    <Button
      height="22px"
      fontSize="8pt"
      onClick={(event) => {
        event.stopPropagation();
        onJoinLeave(community, isJoined);
      }}
      variant={isJoined ? "outline" : "solid"}
    >
      {isJoined ? "Joined" : "Join"}
    </Button>
  );
};

export default JoinButton;
