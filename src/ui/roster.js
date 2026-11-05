// Renders and manages the duck roster: searching and filtering by duck name,
// description, or creator; showing sprite cards and stats; and coordinating
// player selections, availability, and hover details in the selection UI.
export function createRosterUI({
  runtime,
  querySelector,
  querySelectorAll,
  getCurrentPlayer,
  getDuckGraphic,
  escapeHtml,
  selectDuckForPlayer,
}) {
  function getPlayersSelectingDuck(duckId) {
    return runtime.players.filter((player) => player.duckId === duckId);
  }

  function getFilteredDucks() {
    const query = runtime.state.query.trim().toLowerCase();
    if (!query) return runtime.ducks;

    const matches = runtime.ducks.filter((duck) => {
      const searchableText = [duck.name, duck.description, duck.creator].join(' ').toLowerCase();
      return searchableText.includes(query);
    });
    const visibleDucks = new Map(matches.map((duck) => [duck.id, duck]));
    for (const player of runtime.players) {
      if (!player.duckId) continue;
      const selectedDuck = runtime.ducks.find((duck) => duck.id === player.duckId);
      if (selectedDuck) visibleDucks.set(selectedDuck.id, selectedDuck);
    }
    return [...visibleDucks.values()];
  }

  function renderRoster() {
    const roster = querySelector('#rosterScroll');
    if (!runtime.ducks.length) {
      if (runtime.state.apiStatus !== 'error') roster.innerHTML = '<div class="loading">No ducks found.</div>';
      querySelector('#rosterCount').textContent = '0 ducks';
      return;
    }

    const visibleDucks = getFilteredDucks();
    querySelector('#rosterCount').textContent = `${visibleDucks.length} / ${runtime.ducks.length}`;
    if (!visibleDucks.length) {
      roster.innerHTML = '<div class="loading">No ducks match that search.</div>';
      return;
    }

    roster.innerHTML = `<div class="duck-grid">${visibleDucks.map(renderDuckCard).join('')}</div>`;
    for (const card of querySelectorAll('.duck-card')) {
      const duck = runtime.ducks.find((candidate) => candidate.id === card.dataset.duck);
      card.addEventListener('mouseenter', () => renderDuckDetails(duck));
      card.addEventListener('focus', () => renderDuckDetails(duck));
      card.addEventListener('click', () => selectDuckForPlayer(duck));
    }
  }

  function renderDuckCard(duck) {
    const owners = getPlayersSelectingDuck(duck.id);
    const isMine = owners.some((player) => player.id === runtime.myPlayerId);
    const isSelected = owners.length > 0;
    const ownerLabel = owners.map((player) => `P${player.slot}`).join(' + ');
    const selectedRibbon = isSelected
      ? `<span class="selected-ribbon">${isMine ? 'YOU ? ' : ''}${ownerLabel}</span>`
      : '';
    const unavailableLabel = duck.selectable ? '' : '<span class="unavailable-tag">Unavailable</span>';
    const unavailableClass = duck.selectable ? '' : 'unavailable';
    const disabledAttribute = duck.selectable ? '' : 'disabled';
    const ownerColor = owners[0]?.color || '#e8bd55';
    return `<button type="button" class="duck-card ${isSelected ? 'selected ' : ''}${unavailableClass}" style="--card-accent:${ownerColor}" data-duck="${escapeHtml(duck.id)}" ${disabledAttribute} aria-label="${escapeHtml(duck.name)}${duck.selectable ? '' : ' unavailable'}">${selectedRibbon}${unavailableLabel}<span class="duck-art">${getDuckGraphic(duck)}</span><span class="duck-name">${escapeHtml(duck.name)}</span></button>`;
  }

  function renderDuckDetails(duck) {
    if (!duck) return;
    runtime.hoverDuck = duck;
    const owners = getPlayersSelectingDuck(duck.id).map((player) => `P${player.slot}`).join(', ');
    const profileLabel = duck.selectable ? 'Fighter profile' : 'Unavailable fighter';
    const statusLabel = owners ? `PICKED ${owners}` : duck.derpy ? 'DERPY' : 'READY';
    const missingData = duck.selectable
      ? ''
      : `<div class="detail-bio" style="color:#ff9389;margin-top:9px">Missing required ${escapeHtml(duck.missing.join(' and '))} data.</div>`;
    querySelector('#detailsPanel').innerHTML = `
      <div class="details-top"><span class="details-kicker">${profileLabel}</span><span class="step-tag" style="font-size:8px">${statusLabel}</span></div>
      <div class="detail-art">${getDuckGraphic(duck)}</div>
      <h3 class="detail-name">${escapeHtml(duck.name)}</h3>
      <div class="detail-creator">Built by ${escapeHtml(duck.creator)}</div>
      <p class="detail-bio">${escapeHtml(duck.description || 'No description provided.')}</p>
      <div class="stats">${renderStatRow(duck, 'Strength', 'strength')}${renderStatRow(duck, 'Health', 'health')}${renderStatRow(duck, 'Focus', 'focus')}</div>
      ${missingData}`;
  }

  function renderStatRow(duck, label, statName) {
    const statValue = duck.stats[statName];
    const normalizedValue = Math.max(0, Math.min(100, Number(statValue) || 0));
    const width = Math.max(5, normalizedValue * 10);
    return `<div class="stat-row"><div class="stat-label"><span>${label}</span><b>${escapeHtml(statValue)}</b></div><div class="meter"><i style="width:${width}%"></i></div></div>`;
  }

  function renderPlayers() {
    const slots = Array.from({ length: 4 }, (_, index) => (
      runtime.players.find((player) => player.slot === index + 1)
    ));
    querySelector('#playerStrip').innerHTML = slots.map(renderPlayerSlot).join('');
    const currentPlayer = getCurrentPlayer();
    const selectedDuck = runtime.ducks.find((duck) => duck.id === currentPlayer?.duckId);
    querySelector('#selectionHint').textContent = currentPlayer?.duckId
      ? `Your fighter: ${selectedDuck?.name || 'selected'} ? click a different duck to switch`
      : 'Select a ready duck to mark your fighter.';
    const readyButton = querySelector('#readyButton');
    readyButton.disabled = !currentPlayer?.duckId || runtime.game.active;
    readyButton.classList.toggle('is-ready', !!currentPlayer?.ready);
    readyButton.textContent = currentPlayer?.ready ? 'Not ready' : 'Ready up';
  }

  function renderPlayerSlot(player, index) {
    const slotNumber = index + 1;
    if (!player) {
      return `<div class="player-slot empty" data-number="${slotNumber}" style="--pcolor:#495661"><span class="ps-name">Waiting for player</span><span class="ps-duck">Share the room code to invite</span></div>`;
    }
    const name = `${escapeHtml(player.name)}${player.id === runtime.myPlayerId ? ' (YOU)' : ''}`;
    const offline = player.online === false;
    const status = `${offline ? ' ? RECONNECTING' : ''}${player.ready ? '<span class="ps-ready">READY</span>' : ''}`;
    const selectedDuck = runtime.ducks.find((duck) => duck.id === player.duckId);
    const duckName = player.duckId ? escapeHtml(selectedDuck?.name || 'Selected duck') : 'Choose a duck?';
    return `<div class="player-slot ${player.id === runtime.myPlayerId ? 'me ' : ''}${offline ? 'offline' : ''}" data-number="${slotNumber}" style="--pcolor:${player.color}"><span class="ps-name">${name}${status}</span><span class="ps-duck">${duckName}</span></div>`;
  }

  return { renderRoster, renderDuckDetails, renderPlayers };
}
