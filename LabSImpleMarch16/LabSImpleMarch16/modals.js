const modal = document.getElementById('memberModal');
const modalImage = document.getElementById('modalImage');
const modalName = document.getElementById('modalName');
const modalTitle = document.getElementById('modalTitle');
const modalLinkedIn = document.getElementById('modalLinkedIn');
const modalBio = document.getElementById('modalBio');
const closeModal = document.querySelector('.close');
const prev = document.querySelector('.prev');
const next = document.querySelector('.next');

// Index of currently displayed member (for prev/next navigation)
let currentIndex = 0;
const teamMembers = document.querySelectorAll('.team-member');

function showModal(index) {
    // Grabbing member data from index.html to display in modal
    const member = teamMembers[index];
    const imgSrc = member.querySelector('img').src;
    // Adjusting image source for cropped version
    const croppedImgSrc = imgSrc.replace('/headshots/', '/headshots/cropped/');
    const name = member.querySelector('h3').textContent;
    const title = member.querySelector('p').textContent;
    const bio = member.querySelector('.member-bio').innerHTML;
    const linkedIn = member.querySelector('a') ? member.querySelector('a').href : '#';

    modalImage.src = croppedImgSrc;
    modalName.textContent = name;
    modalTitle.textContent = title;
    modalLinkedIn.href = linkedIn;
    modalBio.innerHTML = bio;

    modal.style.display = 'block';
    // Locking background scrolls
    document.body.classList.add('modal-open'); 
    currentIndex = index;
}

function closeModalFunction() {
    modal.style.display = 'none';
    // Unlocking background scrolls when modal closes
    document.body.classList.remove('modal-open'); 
}

// Modal functionality
teamMembers.forEach((member, index) => {
    member.addEventListener('click', () => {
        showModal(index);
    });
});

// Closing modal
// Via close button
closeModal.addEventListener('click', closeModalFunction);
// Via clicking outside the modal
window.addEventListener('click', (event) => {
    if (event.target == modal) {
        closeModalFunction();
    }
});

// Navigate to previous member
prev.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + teamMembers.length) % teamMembers.length;
    showModal(currentIndex);
});

// Navigate to next member
next.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % teamMembers.length;
    showModal(currentIndex);
});