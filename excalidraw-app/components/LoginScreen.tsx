import { useState } from "react";
import { getMessages } from "../selfhost/ui";

type Messages = ReturnType<typeof getMessages>;

export const LoginScreen = ({
  messages,
  errorMessage,
  isSubmitting,
  onSubmit,
}: {
  messages: Messages;
  errorMessage: string;
  isSubmitting: boolean;
  onSubmit: (password: string) => Promise<void>;
}) => {
  const [password, setPassword] = useState("");

  return (
    <div className="selfhost-auth">
      <div className="selfhost-auth__card">
        <div className="selfhost-auth__eyebrow">{messages.appTitle}</div>
        <h1>{messages.loginTitle}</h1>
        <p>{messages.loginDescription}</p>
        <form
          className="selfhost-auth__form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(password);
          }}
        >
          <label className="selfhost-auth__label" htmlFor="password">
            {messages.passwordLabel}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={messages.passwordPlaceholder}
          />
          {errorMessage ? (
            <div className="selfhost-auth__error">{errorMessage}</div>
          ) : null}
          <button disabled={isSubmitting || !password.trim()} type="submit">
            {isSubmitting ? messages.loggingIn : messages.loginButton}
          </button>
        </form>
      </div>
    </div>
  );
};
