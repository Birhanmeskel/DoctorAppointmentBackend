// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user',phone,fin,frontImage,backImage } = req.body;

    // checking for all data to register user
    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details, fill them" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // validating strong password
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please enter a strong password",
      });
    }

    // Check if role is valid
    if (!['user', 'doctor', 'admin'].includes(role)) {
      return res.json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // hashing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      fin,
      frontImage,
      backImage
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();
    const token = jwt.sign({ 
      id: user._id,
      role: user.role 
    }, process.env.JWT_SECRET);

    res.json({ success: true, token, role: user.role });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ 
        id: user._id,
        role: user.role 
      }, process.env.JWT_SECRET);
      
      res.json({ 
        success: true, 
        token,
        role: user.role
      });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};