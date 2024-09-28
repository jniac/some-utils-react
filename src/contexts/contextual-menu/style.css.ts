export default /* css */`
  .ContextualMenu {
    --foreground: #eee;
    --background: #222;

    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .5rem;
    padding: .5rem;

    background-color: var(--background);
    color: var(--foreground);

    font-size: .8rem;

    border-radius: .25rem;
  }

  .ContextualMenu h1 {
    opacity: .5;
  }
  
  .ContextualMenu button {
    cursor: pointer;
    border-radius: .125rem;
    padding: .25rem .5rem;
    background-color: var(--background);
  }

  .ContextualMenu button:hover {
    filter: brightness(1.2);
  }
`