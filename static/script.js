const AVAILABLE_FILE_TYPES = {
	PNG: "image/png",
	JPG: "image/jpeg",
	WEBP: "image/webp",
};

const DELETE_ICON_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  fill="none"
  viewBox="0 0 24 24"
>
  <path
    fill="#000"
    d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"
  />
</svg>`;

let filesList = [];

function fileToByteArray(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const arrayBuffer = reader.result;
			const byteArray = new Uint8Array(arrayBuffer);
			resolve([...byteArray]);
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}

async function uploadFiles() {
	const optimizeButton = document.getElementById("optimize-button");

	const items = [];
	for await (const item of filesList) {
		items.push({
			goaltype: item.goalType,
			name: formatFileName(item.file.name),
			bytes: await fileToByteArray(item.file),
		});
	}

	try {
		optimizeButton.innerHTML = "Optimizing...";
		const req = await fetch("http://localhost:3000/optimize-files", {
			method: "POST",
			responseType: "blob",
			body: JSON.stringify(items),
		});
		const blob = await req.blob();

		if (blob.type !== "application/zip") {
			throw new Error("Response blob must be of type application/zip");
		}

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "optimized.zip";
		link.click();
		link.remove();
		URL.revokeObjectURL(url);

		filesList = [];
		updateFilesListDOM();
	} catch (e) {
		console.log(e);
	} finally {
		optimizeButton.innerHTML = "Optimize";
	}
}

function formatFileSize(size) {
	if (size >= 1024 * 1024) {
		return `${(size / (1024 * 1024)).toFixed(2)} MB`;
	}

	return `${(size / 1024).toFixed(2)} KB`;
}

function formatFileName(name) {
	const split = name.split(".");
	split.pop();
	return split.join("");
}

function removeFileFromList(id) {
	const idx = filesList.findIndex((e) => e.id === id);
	if (idx >= 0) {
		filesList.splice(idx, 1);
		updateFilesListDOM();
	}
}

function addFilesToList(files) {
	for (const file of files) {
		filesList.push({
			id: Math.random().toString(),
			file: file,
			goalType: file.type,
		});
	}
}

function updateFilesListDOM() {
	const fileList = document.getElementById("files-list");

	const currentFilesEls = document.querySelectorAll(".files-list__item");
	for (const el of currentFilesEls) {
		el.remove();
	}

	for (const item of filesList) {
		const li = document.createElement("li");

		const options = [];
		for (const type of Object.values(AVAILABLE_FILE_TYPES)) {
			let selected = "";

			if (type === item.goalType) {
				selected = "selected";
			}

			options.push(`<option value="${type}" ${selected}>${type}</option>`);
		}

		li.classList.add("files-list__item");
		li.innerHTML = `
      <p class="files-list__item-title">${formatFileName(item.file.name)}</p>
      <p>${formatFileSize(item.file.size)}</p>
      <p>${item.file.type}</p>
      <select onchange="onChangeItemType(event, '${item.id}')">
        ${options.join("")}
      </select>
      <div class="files-list__actions">
        <button 
          class="files-list__delete-btn" 
          onclick="removeFileFromList('${item.id}')"
        >
          ${DELETE_ICON_SVG}
        </button>
      </div>
    `;
		fileList.appendChild(li);
	}

	const optimizeButton = document.getElementById("optimize-button");
	optimizeButton.setAttribute(
		"data-visible",
		filesList.length > 0 ? "true" : "false",
	);
}

function onHandleFileInputChange(e) {
	addFilesToList(e.target.files);
	updateFilesListDOM();
	e.target.value = "";
}

function onDrop(e) {
	e.preventDefault();
	addFilesToList(e.dataTransfer.files);
	updateFilesListDOM();
}

function onDragOver(e) {
	e.preventDefault();
}

function onPickImages(e) {
	const fileInput = document.getElementById("file-input");
	fileInput.click();
}

function onChangeItemType(event, itemId) {
	const idx = filesList.findIndex((e) => e.id === itemId);
	if (idx >= 0) {
		filesList[idx].goalType = event.target.value;
		updateFilesListDOM();
	}
}
