const form = document.getElementById("settingsForm");

form.addEventListener("submit", function(e){
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    theme: document.getElementById("theme").value
  };

  localStorage.setItem("userSettings", JSON.stringify(data));

  if(data.theme === "dark"){
    document.body.style.background = "#0f172a";
    document.body.style.color = "white";
  } else {
    location.reload();
  }

  alert("Settings Saved!");
});