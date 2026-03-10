type ModifierEvent = Pick<MouseEvent | KeyboardEvent, 'altKey'>;

function isMacPlatform(): boolean {
  return /mac/i.test(navigator.platform);
}

export function isOrderModifierPressed(event: ModifierEvent): boolean {
  // Windows uses Alt, macOS uses Option; both are exposed as altKey.
  if (isMacPlatform()) {
    return event.altKey;
  }

  return event.altKey;
}
