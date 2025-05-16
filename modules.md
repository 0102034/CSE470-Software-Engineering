Module 1: User Authentication and Verification (Scrum Master - MABIA FERDOUS)

a) User Registration and Login:
- University email registration and secure password setup.
- Login/logout with password recovery via email.
- Email verification and manual ID card verification by admin.

b) Profile Management:
- Profile creation with name, major, year, and photo.
- Profiles are private and visible to verified users only.

c) Admin Dashboard:
- Admins can approve/reject users and verify ID cards.
- Admins can block users violating guidelines.

**Key Working Functions:**
- register_user(email, password)
- login_user(email, password)
- upload_id_card(user_id, image)
- approve_user(user_id)
- block_user(user_id)

Module 2: Marketplace for Trading Goods (Scrum Master - MD ABDUR ROB)

a) Item Listing and Management:
- Users can post items for sale with details, photos, and prices.
- Edit/delete listings as needed.

b) Search and Filter:
- Search items by keyword, filter by category, price, or condition.
- Sort results by relevance, price, or date.

c) Secure Transactions:
- In-app messaging for buyers and sellers.
- Transaction history and post-transaction ratings.

**Key Working Functions:**
- create_listing(user_id, item_info)
- search_items(query, filters)
- send_message(sender_id, receiver_id, message)
- get_transaction_history(user_id)
- rate_user(transaction_id, rating)

Module 3: Ride Share (Scrum Master - [Assign Name])

a) Ride Offer & Request:
- Users can offer rides or request rides within the university community.
- Specify pickup, drop-off, date/time, number of seats, and contact info.

b) Ride Matching & Booking:
- Search and filter available rides by route, date, or time.
- Book a seat in an offered ride.

c) Ride Management:
- Users can view, edit, or cancel their ride offers/requests.
- Manage ride history and upcoming bookings.

d) In-App Communication:
- Users can message ride providers/requesters for coordination.
- Admins can send important ride-related notifications.

e) Admin Oversight:
- Admins can monitor ride postings for safety and compliance.
- Remove inappropriate or fraudulent ride offers/requests.

**Key Working Functions:**
- offer_ride(user_id, ride_info)
- request_ride(user_id, ride_request)
- search_rides(query, filters)
- book_ride(user_id, ride_id)
- admin_remove_ride(ride_id)

Module 4: Lost & Found (Scrum Master - [Assign Name])

a) Lost Item Reporting:
- Users can report lost items with details, location, and contact info.

b) Found Item Reporting:
- Users can post found items with description and pickup instructions.

c) Item Matching & Claiming:
- System matches lost and found items by keywords or category.
- Users can claim found items by contacting the reporter.

d) Notification & Updates:
- Users receive notifications about possible matches or claim status.
- Admins can broadcast important updates about lost/found items.

e) Admin Verification & Management:
- Admins verify and approve item claims to prevent misuse.
- Admins can remove inappropriate or duplicate reports.

**Key Working Functions:**
- report_lost_item(user_id, item_info)
- report_found_item(user_id, item_info)
- match_items(lost_item_id, found_item_id)
- claim_item(user_id, item_id)
- admin_verify_claim(item_id)

## About Us

<table>
  <tr>
    <td align="center">
      <img src="https://randomuser.me/api/portraits/men/32.jpg" width="80" height="80" alt="Mabia Ferdous"/><br/>
      <b>Mabia Ferdous</b><br/>
      <a href="https://linkedin.com/in/mabiaferdous">LinkedIn</a> |
      <a href="https://github.com/mabiaferdous">GitHub</a>
    </td>
    <td align="center">
      <img src="https://randomuser.me/api/portraits/men/45.jpg" width="80" height="80" alt="Md Abdur Rob"/><br/>
      <b>Md Abdur Rob</b><br/>
      <a href="https://linkedin.com/in/mdabdurrob">LinkedIn</a> |
      <a href="https://github.com/mdabdurrob">GitHub</a>
    </td>
    <td align="center">
      <img src="https://randomuser.me/api/portraits/women/68.jpg" width="80" height="80" alt="Jobayer Hossain"/><br/>
      <b>Jobayer Hossain</b><br/>
      <a href="https://linkedin.com/in/jobayerhossain">LinkedIn</a> |
      <a href="https://github.com/jobayerhossain">GitHub</a>
    </td>
    <td align="center">
      <img src="https://randomuser.me/api/portraits/women/77.jpg" width="80" height="80" alt="Sadia Rahman"/><br/>
      <b>Sadia Rahman</b><br/>
      <a href="https://linkedin.com/in/sadiarahman">LinkedIn</a> |
      <a href="https://github.com/sadiarahman">GitHub</a>
    </td>
  </tr>
</table>
