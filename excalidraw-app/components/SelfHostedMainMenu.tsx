import React from "react";
import type { Theme } from "@excalidraw/excalidraw/element/types";
import { MainMenu } from "@excalidraw/excalidraw/index";
import {
  PlusIcon,
  loginIcon,
  save,
} from "@excalidraw/excalidraw/components/icons";
import { LanguageList } from "../app-language/LanguageList";
import { getMessages } from "../selfhost/ui";

type Messages = ReturnType<typeof getMessages>;

export const SelfHostedMainMenu = React.memo(
  ({
    messages,
    saveDisabled,
    isMobile,
    theme,
    setTheme,
    onCreateBoard,
    onOpenBoards,
    onSaveBoard,
    onLogout,
  }: {
    messages: Messages;
    saveDisabled: boolean;
    isMobile: boolean;
    theme: Theme | "system";
    setTheme: (theme: Theme | "system") => void;
    onCreateBoard: () => void;
    onOpenBoards: () => void;
    onSaveBoard: () => void;
    onLogout: () => void;
  }) => {
    return (
      <MainMenu>
        <MainMenu.Item icon={PlusIcon} onSelect={onCreateBoard}>
          {messages.newBoard}
        </MainMenu.Item>
        {isMobile ? (
          <MainMenu.Item onSelect={onOpenBoards}>{messages.openBoards}</MainMenu.Item>
        ) : null}
        <MainMenu.Item
          icon={save}
          onSelect={onSaveBoard}
          disabled={saveDisabled}
        >
          {messages.saveBoard}
        </MainMenu.Item>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.CommandPalette className="highlighted" />
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme
          allowSystemTheme
          theme={theme}
          onSelect={setTheme}
        />
        <MainMenu.ItemCustom>
          <LanguageList style={{ width: "100%" }} />
        </MainMenu.ItemCustom>
        <MainMenu.DefaultItems.ChangeCanvasBackground />
        <MainMenu.Separator />
        <MainMenu.Item icon={loginIcon} onSelect={onLogout}>
          {messages.logout}
        </MainMenu.Item>
      </MainMenu>
    );
  },
);
