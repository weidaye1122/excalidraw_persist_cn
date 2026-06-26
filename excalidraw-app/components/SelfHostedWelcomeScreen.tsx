import React from "react";
import { WelcomeScreen } from "@excalidraw/excalidraw/index";
import { PlusIcon } from "@excalidraw/excalidraw/components/icons";
import { getMessages } from "../selfhost/ui";

type Messages = ReturnType<typeof getMessages>;

export const SelfHostedWelcomeScreen = React.memo(
  ({
    messages,
    onCreateBoard,
  }: {
    messages: Messages;
    onCreateBoard: () => void;
  }) => {
    return (
      <WelcomeScreen>
        <WelcomeScreen.Hints.MenuHint />
        <WelcomeScreen.Hints.ToolbarHint />
        <WelcomeScreen.Hints.HelpHint />
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Logo />
          <WelcomeScreen.Center.Heading>
            {messages.welcomeHeading}
          </WelcomeScreen.Center.Heading>
          <WelcomeScreen.Center.Menu>
            <WelcomeScreen.Center.MenuItemLoadScene />
            <WelcomeScreen.Center.MenuItemHelp />
            <WelcomeScreen.Center.MenuItem
              icon={PlusIcon}
              onSelect={onCreateBoard}
              shortcut={null}
            >
              {messages.newBoard}
            </WelcomeScreen.Center.MenuItem>
          </WelcomeScreen.Center.Menu>
        </WelcomeScreen.Center>
      </WelcomeScreen>
    );
  },
);
