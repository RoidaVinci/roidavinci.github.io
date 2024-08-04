---
layout: default
title: "Final Report of the External Internship at IDIS"
---

# Final Report of the External Internship at IDIS

## Introduction
The Neuroimaging and Biotechnology Laboratory (NOBEL) at the Health Research Institute (IDIS) is located in the Hospital Clínico Universitario de Santiago de Compostela. It conducts neuroimaging analysis tasks aimed at preclinical studies (those carried out in animal models before being transferred to humans). The primary focus in the laboratory involves preclinical tests on rodents, studying the effects of certain inoculated substances over time. The ultimate goal is to extrapolate the results to relevant medical information about humans. Various stations are used, from image acquisition methods like magnetic resonance imaging to a computerized area for analysis and operating tables for rodents.

During my internship, I worked on obtaining brain maps of rodents through software processing of preclinical magnetic resonance imaging (MRI), for the subsequent extraction of relevant data and parameters for precise analysis.

## Magnetic Resonance Imaging
Magnetic resonance imaging (MRI) is an indirect method of obtaining images of objects inaccessible through conventional lenses, such as human or rat organs. Its foundation is purely physical, using a magnetic field and subsequent transverse magnetic fields to obtain precise wave information about each point in space. This allows the reconstruction of two-dimensional images of the interiors of bodies.

Under certain physical assumptions, the application of an external magnetic field to an isolated system containing Hydrogen nuclei causes the spins to predominantly align in the direction of the magnetic field. This creates a net magnetization, <code>M</code>, which is the sum of the magnetic moments of all Hydrogen nuclei in the system, described by the following equations over time:

$$
\begin{cases}
M_x(t)=M_0 e^{-\frac{t}{T_2}} \sin(\omega t), \\
M_y(t)=M_0 e^{-\frac{t}{T_2}} \cos(\omega t), \\
M_z(t)=M_0 (1-e^\frac{-t}{T_1}),
\end{cases}
$$

where <code>M_0</code> is the initial value of the net magnetization, greater with a stronger external magnetic field, and <code>T_1</code> and <code>T_2</code> are parameters dependent on the physico-chemical structure of the sample. The times <code>T_1</code> and <code>T_2</code> represent the time for the transverse components <code>M_x</code> and <code>M_y</code> and the longitudinal component <code>M_z</code> to return to <code>1-\frac{1}{e} \approx 0.63</code> of their equilibrium values. This process is crucial for subsequent MRI image analysis, as explained later.

<p align="center">
  <img src="../imaxes/mxymz.png" alt="Figure 1" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 1: Illustration showing the tendency of net magnetization to return to the longitudinal axis, making the transverse magnetization null over time.</em>
</p>

In practice, the transverse component <code>M_x</code>, <code>M_y</code> does not return to <code>1-\frac{1}{e}</code> of the equilibrium value within <code>T_2</code>. Local chemical structure differences and magnetic field inhomogeneities cause this process to be faster. Hence, the observed decay time <code>T_2^*</code> is defined as:

$$
T_2^*=\frac{1}{\frac{1}{T_2}+\gamma\Delta B_0}
$$

where <code>\gamma</code> is the gyromagnetic ratio and <code>\Delta B_0</code> is the magnetic field variation at the measurement point. <code>T_2^*</code> is the practical decay time of the transverse component to <code>\frac{1}{e}</code>, often more useful and reliable for studies, requiring more uniform magnetic fields due to greater sensitivity to field irregularities.

Relaxation times <code>T_1</code> and <code>T_2</code>, and thus <code>T_2^*</code>, depend on the amount and size of water molecules and hydrophilic molecules (those tending to chemically combine with water). This theoretical and practical relationship is vital for creating images of living specimens.

MRI captures electromagnetic wave information, encapsulating all system data in the K-space, <code>\mathbb{K}</code>:

$$
(k_x,k_y)(t)=\left(\int_{0}^t\gamma G_x(u)du,\int_{0}^t\gamma G_y(u)du\right)\in\mathbb{K},
$$

where <code>\gamma</code> is the gyromagnetic ratio, and <code>G_x</code> and <code>G_y</code> are the magnetic gradients. The K-space contains wave information for MRI data, allowing image reconstruction through inverse Fourier series, using methods like the Fast Fourier Transform. K-space data is often halved using theoretical central symmetry, accelerating reconstruction.

<p align="center">
  <img src="../imaxes/kespacio.png" alt="Figure 2" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 2: K-space of an MRI of a human brain and associated image.</em>
</p>

Depending on the type of analysis, we process and normalize the above information into <code>T_1</code>, <code>T_2</code>, and <code>T_2^*</code> maps, where each pixel has a value in the range <code>[0,1]</code> on a grayscale, more intense for longer <code>T_1</code>, <code>T_2</code>, or <code>T_2^*</code> times.

## Analysis of MRI Images
Depending on the study, chemical properties of the components involved, and the applied magnetic field, one of the aforementioned imaging methods may be more useful. After obtaining the desired map, either <code>T_1</code>, <code>T_2</code>, or <code>T_2^*</code>, it must be analyzed to extract clinical information. Depending on the study, a wide range of parameters, cuts, or statistical information, such as the mean or variance of <code>T_1</code>, <code>T_2</code>, and <code>T_2^*</code> within an image or between images at different times, may be of interest. This helps to test hypotheses, such as whether <code>T_2</code> remains unchanged after irradiating a rat's brain, thereby ruling out tumors or brain diseases due to radiation.

<p align="center">
  <img src="../imaxes/scan.png" alt="Figure 3" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 3: <code>T_2^*</code> MRI of a rat's brain with 12 slices showing a small lesion in the right frontal area (whiter area).</em>
</p>

It is often useful to crop certain parts of the image to remove irrelevant information, measuring properties of the parts involved in a process. For instance, segmenting a person's brain to isolate an area affected by a hemorrhage, confirming the presence of the hemorrhage as described earlier.

<p align="center">
  <img src="../imaxes/segmentadomanual.png" alt="Figure 4" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 4: Manual segmentation of the lesion shown in Figure 3.</em>
</p>

## Activities Performed
My initial days at IDIS were dedicated to familiarizing myself with the processes carried out by an MRI laboratory operator and the theoretical concepts underlying these tasks, from physical principles to programming and mathematics. Given the vast scope of this field and my focus on image segmentation, I specifically concentrated on programming for image processing and segmentation, leaving aside non-essential details and advanced physical theory. I began learning Python, widely reputed in scientific domains, and particularly used in automatic image segmentation. After the first week, I collaborated in processing and analyzing MRIs from a clinical study on the potential influence of radiation on rat brain development. This study was conducted with three control times: before exposure, at 48 hours, and at 30 days. For image processing, semi-automated software is already in use, consisting of a series of plugins based on the ImageJ program, transforming raw format images (2seq) to the desired visual format, in my case, processed images of <code>T_2</code> and <code>T_2^*</code>. I then manually analyzed and segmented each image in search of relevant information, such as the formation of tumors or internal hemorrhages.

## Proposed Solution
This problem has had satisfactory solutions for humans for a long time. Solutions for rat and mouse brains are more recent and still far from ideal, but currently provide better results in terms of the Sørensen-Dice coefficient (DICE), indicating overlap between two segmentations <code>A,B\subset\mathbb{R}^2</code>, defined as:

$$
DICE(A,B):=\frac{2\operatorname{Area}(A\cap B)}{\operatorname{Area}(A)+\operatorname{Area}(B)},
$$

The process of setting up the neural network to analyze the IDIS images was the most challenging part. After configuring it, we found that the network, despite yielding results indicating good performance, required further adjustments to match the actual segmentation needs. I introduced images obtained from other laboratories, and these provided more satisfactory results, as shown in Figure 6.

<p align="center">
  <img src="../imaxes/segmentadoauto.png" alt="Figure 6" style="max-width: 50%;">
</p>
<p align="center">
  <em>Figure 6: Automatic segmentation of the images from Figure 3 performed by the RatLesNetv2 neural network with training data from homogeneous/model-3. See [GitHub/jmlipman/RatLesNetv2](https://github.com/jmlipman/RatLesNetv2#3-training-and-evaluation).</em>
</p>

The conclusion drawn from this was that there was likely a significant difference between the images obtained at IDIS and those obtained at the Charles River laboratory, where the RatLesNetv2 network was trained. This difference could stem from variations in magnetic fields, receivers, or scanner times, as well as the formats and standards used by the laboratory in terms of the number of slices or image resolutions. This necessitates the neural network to be retrained from scratch with images from the NOBEL laboratory and their respective segmentations. Although this process requires hundreds of images and is tremendously time-consuming, it remains a viable solution for the future.

