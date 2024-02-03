const userList = document.querySelector(".user-list");
const userName = document.querySelector("#user");

let userDataArr = [];

const getUserData = async (query) => {
	try {
		let response = await fetch(`/search?query=${query}`);
		let userData = await response.json();

		if (userData) {
			userList.innerHTML = "";
		}

		userData.map((data) => {
			const list = document.createElement("li");
			userDataArr.push(list);
			list.insertAdjacentHTML(
				"afterbegin",
				`<div class="user-data">
                    <img src=${data.avatar_url}>
                    <div>
                        <p>${data.login}</p>
                        <a href=${data.html_url} target="_blank">${data.html_url}</a>
                    </div>
                </div> 
            `
			);
			userList.appendChild(list);
		});
	} catch (err) {
		console.error("Error fetching user data:", err);
	}
};

userName.addEventListener("input", (e) => {
	const searchValue = e.target.value;

	getUserData(searchValue);

	userDataArr.forEach((userData) => {
		const userDataText = userData.innerText.toLowerCase();
		if (userDataText.includes(searchValue.toLowerCase())) {
			userData.classList.remove("hide");
		} else {
			userData.classList.add("hide");
		}
	});
});
