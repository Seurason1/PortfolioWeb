(function () {
  const data = window.PORTFOLIO_DATA;
  const state = {
    activeProjectIndex: -1,
    activeImageIndex: 0,
    lastFocusedElement: null,
    masonryColumnCount: 0,
    projectCards: [],
    resizeFrame: 0,
    wheelTimer: 0,
    imageDragActive: false,
    imageDragMoved: false,
    imageDragPointerId: null,
    imageDragStartX: 0,
    imageDragStartY: 0,
    imageDragScrollLeft: 0,
    imageDragScrollTop: 0
  };

  const selectors = {
    header: document.querySelector("[data-header]"),
    artistName: document.querySelector("[data-artist-name]"),
    footerName: document.querySelector("[data-footer-name]"),
    role: document.querySelector("[data-role]"),
    heroTitle: document.querySelector("[data-hero-title]"),
    heroRole: document.querySelector("[data-hero-role]"),
    heroCopy: document.querySelector("[data-hero-copy]"),
    aboutTitle: document.querySelector("[data-about-title]"),
    aboutCopy: document.querySelector("[data-about-copy]"),
    skillList: document.querySelector("[data-skill-list]"),
    contactLinks: document.querySelector("[data-contact-links]"),
    contactSection: document.querySelector("[data-contact-section]"),
    contactNav: document.querySelector("[data-contact-nav]"),
    projectGrid: document.querySelector("[data-project-grid]"),
    year: document.querySelector("[data-year]"),
    modal: document.querySelector("[data-modal]"),
    modalMedia: document.querySelector("[data-modal-media]"),
    modalStage: document.querySelector("[data-modal-stage]"),
    modalImage: document.querySelector("[data-modal-image]"),
    modalVideo: document.querySelector("[data-modal-video]"),
    modalCategory: document.querySelector("[data-modal-category]"),
    modalTitle: document.querySelector("[data-modal-title]"),
    modalDescription: document.querySelector("[data-modal-description]"),
    modalCount: document.querySelector("[data-modal-count]"),
    modalYear: document.querySelector("[data-modal-year]"),
    thumbnailStrip: document.querySelector("[data-thumbnail-strip]"),
    previousProject: document.querySelector("[data-prev]"),
    nextProject: document.querySelector("[data-next]")
  };

  function setText(element, text) {
    if (element && text) {
      element.textContent = text;
    }
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function isVideoPath(path) {
    return /\.(mp4|webm)$/i.test(path);
  }

  function getProjectMediaAlt(project, mediaIndex) {
    return `${project.title} render ${mediaIndex + 1} of ${project.images.length}`;
  }

  function renderArtist() {
    const artist = data.artist;

    setText(selectors.artistName, artist.name);
    setText(selectors.footerName, artist.name);
    setText(selectors.role, artist.role);
    setText(selectors.heroTitle, artist.name);
    setText(selectors.heroRole, artist.role);
    setText(selectors.heroCopy, artist.heroCopy);
    setText(selectors.aboutTitle, artist.aboutTitle);
    setText(selectors.aboutCopy, artist.aboutCopy);
    setText(selectors.year, String(new Date().getFullYear()));

    document.title = `${artist.name} | ${artist.role}`;

    selectors.skillList.innerHTML = "";
    artist.skills.forEach((skill) => {
      selectors.skillList.append(createElement("span", "skill-pill", skill));
    });
  }

  function getContactItems() {
    const contact = data.artist.contact;
    return [
      { label: "Email", href: contact.email ? `mailto:${contact.email}` : "" },
      { label: "ArtStation", href: contact.artstation },
      { label: "LinkedIn", href: contact.linkedin },
      { label: "GitHub", href: contact.github },
      { label: "Resume", href: contact.resume }
    ].filter((item) => item.href);
  }

  function renderContactLinks() {
    selectors.contactLinks.innerHTML = "";
    const contactItems = getContactItems();
    const hasContactItems = contactItems.length > 0;

    selectors.contactSection.hidden = !hasContactItems;
    selectors.contactNav.hidden = !hasContactItems;

    contactItems.forEach((item) => {
      const link = createElement("a", "button button-secondary", item.label);
      link.href = item.href;
      if (!item.href.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
      selectors.contactLinks.append(link);
    });
  }

  async function syncProjectMedia() {
    const repository = data.repository;
    if (!repository?.owner || !repository?.name || !repository?.branch) {
      return;
    }

    const apiUrl =
      `https://api.github.com/repos/${repository.owner}/${repository.name}` +
      `/git/trees/${repository.branch}?recursive=1`;

    try {
      const response = await fetch(apiUrl, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const repositoryMedia = payload.tree
        .filter((item) => item.type === "blob" && /\.(png|jpe?g|webp|mp4|webm)$/i.test(item.path))
        .map((item) => item.path);

      data.projects.forEach((project) => {
        const folder = project.cover.slice(0, project.cover.lastIndexOf("/") + 1);
        const media = repositoryMedia
          .filter((path) => {
            const fileName = path.slice(path.lastIndexOf("/") + 1);
            return path.startsWith(folder) && !/^sum\.(png|jpe?g|webp)$/i.test(fileName);
          })
          .sort((first, second) =>
            first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" })
          );

        if (media.length > 0) {
          project.images = media;
        }
      });

      if (selectors.modal.classList.contains("is-open")) {
        state.activeImageIndex = Math.min(
          state.activeImageIndex,
          data.projects[state.activeProjectIndex].images.length - 1
        );
        renderModal();
      }
    } catch (error) {
      // The configured media list remains available when GitHub discovery is offline.
    }
  }

  function parseThumbnailRatio(value) {
    const [width, height] = String(value).split("/").map(Number);
    return width > 0 && height > 0 ? width / height : 1;
  }

  function createProjectCard(project, projectIndex) {
    const card = createElement("button", "project-card");
    card.type = "button";
    card.setAttribute("aria-label", `Open ${project.title} project gallery`);
    card.dataset.projectIndex = String(projectIndex);
    card.dataset.inverseRatio = String(1 / parseThumbnailRatio(project.thumbnailRatio));

    const cover = createElement("div", "project-cover");
    if (project.thumbnailRatio) {
      cover.style.aspectRatio = project.thumbnailRatio;
    }

    const image = document.createElement("img");
    image.src = project.cover;
    image.alt = `${project.title} cover render`;
    image.loading = "lazy";
    cover.append(image);

    const title = createElement("h3", "", project.title);
    title.className = "project-title-overlay";
    cover.append(title);
    card.append(cover);
    card.addEventListener("click", () => openProject(projectIndex, 0));
    return card;
  }

  function getProjectColumnCount() {
    const value = getComputedStyle(selectors.projectGrid).getPropertyValue("--project-columns");
    return Math.max(1, Math.min(data.projects.length, Number.parseInt(value, 10) || 1));
  }

  function distributeProjectCards(columnCount) {
    const columns = Array.from({ length: columnCount }, () => []);
    const unitHeights = Array(columnCount).fill(0);

    state.projectCards.forEach((card, index) => {
      let targetColumn = index;
      if (index >= columnCount) {
        targetColumn = unitHeights.indexOf(Math.min(...unitHeights));
      }

      columns[targetColumn].push(card);
      unitHeights[targetColumn] += Number(card.dataset.inverseRatio);
    });

    return columns;
  }

  function balanceProjectColumns(columns) {
    const gridStyle = getComputedStyle(selectors.projectGrid);
    const gap = Number.parseFloat(gridStyle.columnGap) || 0;
    const availableWidth = selectors.projectGrid.clientWidth - gap * (columns.length - 1);
    const unitHeights = columns.map((column) =>
      Array.from(column.children).reduce(
        (total, card) => total + Number(card.dataset.inverseRatio),
        0
      )
    );
    const targetHeight =
      (availableWidth +
        gap *
          columns.reduce(
            (total, column, index) =>
              total + (column.children.length - 1) / unitHeights[index],
            0
          )) /
      unitHeights.reduce((total, unitHeight) => total + 1 / unitHeight, 0);

    columns.forEach((column, index) => {
      const columnGaps = gap * (column.children.length - 1);
      column.style.width = `${(targetHeight - columnGaps) / unitHeights[index]}px`;
    });
  }

  function layoutProjectGrid() {
    const columnCount = getProjectColumnCount();

    if (state.masonryColumnCount !== columnCount) {
      selectors.projectGrid.innerHTML = "";
      const cardGroups = distributeProjectCards(columnCount);
      cardGroups.forEach((cards) => {
        const column = createElement("div", "project-column");
        cards.forEach((card) => column.append(card));
        selectors.projectGrid.append(column);
      });
      state.masonryColumnCount = columnCount;
    }

    balanceProjectColumns(Array.from(selectors.projectGrid.children));
  }

  function scheduleProjectGridLayout() {
    window.cancelAnimationFrame(state.resizeFrame);
    state.resizeFrame = window.requestAnimationFrame(layoutProjectGrid);
  }

  function renderProjects() {
    state.projectCards = data.projects.map(createProjectCard);
    state.masonryColumnCount = 0;
    layoutProjectGrid();
  }

  function openProject(projectIndex, imageIndex) {
    state.activeProjectIndex = projectIndex;
    state.activeImageIndex = imageIndex;
    state.lastFocusedElement = document.activeElement;

    renderModal();
    selectors.modal.classList.add("is-open");
    selectors.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const closeButton = selectors.modal.querySelector("[data-modal-close]");
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeProject() {
    selectors.modal.classList.remove("is-open");
    selectors.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    selectors.modalVideo.pause();
    resetModalImageZoom();

    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus();
    }
  }

  function moveImage(direction) {
    const project = data.projects[state.activeProjectIndex];
    if (!project) {
      return;
    }

    state.activeImageIndex =
      (state.activeImageIndex + direction + project.images.length) % project.images.length;
    renderModalMedia();
    renderThumbnails();
  }

  function setImage(imageIndex) {
    state.activeImageIndex = imageIndex;
    renderModalMedia();
    renderThumbnails();
  }

  function moveProject(direction) {
    state.activeProjectIndex =
      (state.activeProjectIndex + direction + data.projects.length) % data.projects.length;
    state.activeImageIndex = 0;
    renderModal();
  }

  function renderModal() {
    const project = data.projects[state.activeProjectIndex];
    if (!project) {
      return;
    }

    setText(selectors.modalCategory, project.category);
    setText(selectors.modalTitle, project.title);
    setText(selectors.modalDescription, project.description);
    setText(selectors.modalYear, project.year);
    renderModalMedia();
    renderThumbnails();
    updateProjectNavigation();
  }

  function renderModalMedia() {
    const project = data.projects[state.activeProjectIndex];
    const mediaPath = project.images[state.activeImageIndex];
    const showVideo = isVideoPath(mediaPath);

    resetModalImageZoom();
    selectors.modalVideo.pause();
    selectors.modalImage.hidden = showVideo;
    selectors.modalVideo.hidden = !showVideo;

    if (showVideo) {
      selectors.modalVideo.src = mediaPath;
      selectors.modalVideo.load();
      selectors.modalVideo.play().catch(() => {});
    } else {
      selectors.modalVideo.removeAttribute("src");
      selectors.modalImage.src = mediaPath;
      selectors.modalImage.alt = getProjectMediaAlt(project, state.activeImageIndex);
    }

    selectors.modalCount.textContent = `${state.activeImageIndex + 1} / ${project.images.length}`;
  }

  function toggleModalImageZoom(event) {
    if (selectors.modalImage.hidden || !selectors.modalImage.complete) {
      return;
    }

    if (state.imageDragMoved) {
      state.imageDragMoved = false;
      return;
    }

    const rect = selectors.modalImage.getBoundingClientRect();
    const isZoomed = selectors.modalImage.classList.contains("is-zoomed");
    if (isZoomed) {
      resetModalImageZoom();
      return;
    }

    const focusX = (event.clientX - rect.left) / rect.width;
    const focusY = (event.clientY - rect.top) / rect.height;
    selectors.modalStage.classList.add("is-zoomed");
    selectors.modalImage.classList.add("is-zoomed");
    window.requestAnimationFrame(() => {
      selectors.modalStage.scrollLeft = Math.max(
        0,
        selectors.modalImage.offsetWidth * focusX - selectors.modalStage.clientWidth / 2
      );
      selectors.modalStage.scrollTop = Math.max(
        0,
        selectors.modalImage.offsetHeight * focusY - selectors.modalStage.clientHeight / 2
      );
    });
  }

  function resetModalImageZoom() {
    state.imageDragActive = false;
    state.imageDragMoved = false;
    state.imageDragPointerId = null;
    selectors.modalStage.classList.remove("is-zoomed");
    selectors.modalStage.classList.remove("is-dragging");
    selectors.modalImage.classList.remove("is-zoomed");
    selectors.modalStage.scrollLeft = 0;
    selectors.modalStage.scrollTop = 0;
  }

  function handleImageDragStart(event) {
    if (
      event.button !== 0 ||
      !selectors.modalImage.classList.contains("is-zoomed") ||
      event.target !== selectors.modalImage
    ) {
      return;
    }

    state.imageDragActive = true;
    state.imageDragMoved = false;
    state.imageDragPointerId = event.pointerId;
    state.imageDragStartX = event.clientX;
    state.imageDragStartY = event.clientY;
    state.imageDragScrollLeft = selectors.modalStage.scrollLeft;
    state.imageDragScrollTop = selectors.modalStage.scrollTop;
    selectors.modalStage.classList.add("is-dragging");
    selectors.modalStage.setPointerCapture(event.pointerId);
  }

  function handleImageDragMove(event) {
    if (!state.imageDragActive || event.pointerId !== state.imageDragPointerId) {
      return;
    }

    const deltaX = event.clientX - state.imageDragStartX;
    const deltaY = event.clientY - state.imageDragStartY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      state.imageDragMoved = true;
    }

    selectors.modalStage.scrollLeft = state.imageDragScrollLeft - deltaX;
    selectors.modalStage.scrollTop = state.imageDragScrollTop - deltaY;
    event.preventDefault();
  }

  function handleImageDragEnd(event) {
    if (!state.imageDragActive || event.pointerId !== state.imageDragPointerId) {
      return;
    }

    state.imageDragActive = false;
    state.imageDragPointerId = null;
    selectors.modalStage.classList.remove("is-dragging");
    if (selectors.modalStage.hasPointerCapture(event.pointerId)) {
      selectors.modalStage.releasePointerCapture(event.pointerId);
    }
  }

  function updateProjectNavigation() {
    const previousIndex =
      (state.activeProjectIndex - 1 + data.projects.length) % data.projects.length;
    const nextIndex = (state.activeProjectIndex + 1) % data.projects.length;
    const previousLabel = `Previous project: ${data.projects[previousIndex].title}`;
    const nextLabel = `Next project: ${data.projects[nextIndex].title}`;

    selectors.previousProject.setAttribute("aria-label", previousLabel);
    selectors.previousProject.title = previousLabel;
    selectors.nextProject.setAttribute("aria-label", nextLabel);
    selectors.nextProject.title = nextLabel;
  }

  function handleModalWheel(event) {
    if (selectors.modalImage.classList.contains("is-zoomed") || Math.abs(event.deltaY) < 4) {
      return;
    }

    event.preventDefault();
    if (state.wheelTimer) {
      return;
    }

    moveImage(event.deltaY > 0 ? 1 : -1);
    state.wheelTimer = window.setTimeout(() => {
      state.wheelTimer = 0;
    }, 420);
  }

  function renderThumbnails() {
    const project = data.projects[state.activeProjectIndex];
    selectors.thumbnailStrip.innerHTML = "";

    project.images.forEach((mediaPath, mediaIndex) => {
      const button = createElement("button", "thumbnail-button");
      button.type = "button";
      button.setAttribute("aria-label", `Show media ${mediaIndex + 1}`);
      if (mediaIndex === state.activeImageIndex) {
        button.classList.add("is-active");
        button.setAttribute("aria-current", "true");
      }

      const image = document.createElement("img");
      image.src = isVideoPath(mediaPath) ? project.cover : mediaPath;
      image.alt = "";
      image.loading = "lazy";
      button.append(image);
      if (isVideoPath(mediaPath)) {
        const badge = createElement("span", "thumbnail-video-badge");
        badge.setAttribute("aria-hidden", "true");
        button.append(badge);
      }
      button.addEventListener("click", () => setImage(mediaIndex));
      selectors.thumbnailStrip.append(button);
    });
  }

  function handleKeyboard(event) {
    const isModalOpen = selectors.modal.classList.contains("is-open");

    if (!isModalOpen) {
      return;
    }

    if (event.key === "Escape") {
      closeProject();
    }

    if (event.key === "ArrowLeft") {
      moveProject(-1);
    }

    if (event.key === "ArrowRight") {
      moveProject(1);
    }

    if (event.key === "ArrowUp") {
      moveImage(-1);
    }

    if (event.key === "ArrowDown") {
      moveImage(1);
    }
  }

  function handleHeaderState() {
    selectors.header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  function bindEvents() {
    selectors.modal.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", closeProject);
    });

    selectors.previousProject.addEventListener("click", () => moveProject(-1));
    selectors.nextProject.addEventListener("click", () => moveProject(1));
    selectors.modalImage.addEventListener("click", toggleModalImageZoom);
    selectors.modalStage.addEventListener("pointerdown", handleImageDragStart);
    selectors.modalStage.addEventListener("pointermove", handleImageDragMove);
    selectors.modalStage.addEventListener("pointerup", handleImageDragEnd);
    selectors.modalStage.addEventListener("pointercancel", handleImageDragEnd);
    selectors.modalMedia.addEventListener("wheel", handleModalWheel, { passive: false });

    window.addEventListener("keydown", handleKeyboard);
    window.addEventListener("scroll", handleHeaderState, { passive: true });
    window.addEventListener("resize", scheduleProjectGridLayout, { passive: true });
  }

  function init() {
    if (!data || !Array.isArray(data.projects)) {
      return;
    }

    renderArtist();
    renderContactLinks();
    renderProjects();
    bindEvents();
    handleHeaderState();
    syncProjectMedia();
  }

  init();
})();
